import { describe, expect, it } from "vitest";
import {
  addWatchSymbol,
  createAgent,
  decodeWorkspace,
  previewAgent,
} from "./workspace";
import { createDemoWorkspace } from "./demo";
describe("local workspace contracts", () => {
  it("normalizes and deduplicates explicit ticker references in an agent", () => {
    const agent = createAgent(
      "  Track $nvda and $NVDA earnings beside $BRK.B.  ",
      "Weekly",
      "local-1",
    );
    expect(agent.symbols).toEqual(["NVDA", "BRK.B"]);
    expect(agent.prompt).toBe("Track $nvda and $NVDA earnings beside $BRK.B.");
    expect(agent.cadence).toBe("Weekly");
  });
  it("rejects empty and excessively long research routines", () => {
    expect(() => createAgent("   ", "Daily", "bad")).toThrow("8–500");
    expect(() => createAgent("x".repeat(501), "Daily", "bad")).toThrow("8–500");
  });
  it("prevents paused agents from producing checks", () => {
    const paused = createDemoWorkspace().agents.find((a) => !a.active)!;
    expect(() => previewAgent(paused, "check", "2026-10-12T00:00:00Z")).toThrow(
      "Resume",
    );
  });
  it("makes simulated checks explicit, with no claims of fetched sources", () => {
    const event = previewAgent(
      createDemoWorkspace().agents[0]!,
      "check",
      "2026-10-12T00:00:00Z",
    );
    expect(event.agentId).toBe("earnings");
    expect(event.summary).toContain("No sources were fetched");
  });
  it("validates symbols and rejects duplicates after normalization", () => {
    expect(addWatchSymbol(["AAPL"], " brk.b ")).toEqual(["AAPL", "BRK.B"]);
    expect(() => addWatchSymbol(["AAPL"], "aapl")).toThrow("already");
    expect(() => addWatchSymbol([], "<script>")).toThrow("ticker");
  });
  it("round-trips the seed and rejects corrupt, future, and duplicated state", () => {
    const state = createDemoWorkspace();
    expect(decodeWorkspace(JSON.stringify(state))).toEqual(state);
    expect(() => decodeWorkspace("{")).toThrow();
    expect(() =>
      decodeWorkspace(JSON.stringify({ ...state, schemaVersion: 2 })),
    ).toThrow("unsupported");
    expect(() =>
      decodeWorkspace(
        JSON.stringify({
          ...state,
          agents: [{ ...state.agents[0], active: "yes" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      decodeWorkspace(
        JSON.stringify({ ...state, watchlist: ["AAPL", "AAPL"] }),
      ),
    ).toThrow("duplicate");
  });
});
