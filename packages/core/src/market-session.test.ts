import { describe, expect, it } from "vitest";
import { usEquityMarketStatus } from "./market-session";
const at = (date: string) => usEquityMarketStatus(Date.parse(date));
describe("US equity regular-session status", () => {
  it("opens on Monday independently of stale or missing prices", () => {
    expect(at("2026-10-19T14:00:00Z")).toMatchObject({
      status: "Market Open",
      basis: "calendar",
    });
    expect(at("2026-10-19T13:29:59Z").status).toBe("Market Closed");
    expect(at("2026-10-19T13:30:00Z").status).toBe("Market Open");
    expect(at("2026-10-19T19:59:59Z").status).toBe("Market Open");
    expect(at("2026-10-19T20:00:00Z").status).toBe("Market Closed");
  });
  it("handles premarket, postmarket, weekends and the New York date, not UTC day", () => {
    for (const time of [
      "2026-10-19T08:00:00Z",
      "2026-10-19T21:00:00Z",
      "2026-10-18T15:00:00Z",
      "2026-10-20T00:30:00Z",
    ])
      expect(at(time).status).toBe("Market Closed");
  });
  it("uses EST and EDT without a hard-coded UTC offset", () => {
    expect(at("2026-03-06T14:00:00Z").status).toBe("Market Closed");
    expect(at("2026-03-06T14:30:00Z").status).toBe("Market Open");
    expect(at("2026-03-09T13:30:00Z").status).toBe("Market Open");
    expect(at("2026-11-02T14:00:00Z").status).toBe("Market Closed");
    expect(at("2026-11-02T14:30:00Z").status).toBe("Market Open");
  });
  it("observes all reviewed holidays and special observed-day rules", () => {
    const dates = [
      "2026-01-01",
      "2026-01-19",
      "2026-02-16",
      "2026-04-03",
      "2026-05-25",
      "2026-06-19",
      "2026-07-03",
      "2026-09-07",
      "2026-11-26",
      "2026-12-25",
      "2027-01-01",
      "2027-01-18",
      "2027-02-15",
      "2027-03-26",
      "2027-05-31",
      "2027-06-18",
      "2027-07-05",
      "2027-09-06",
      "2027-11-25",
      "2027-12-24",
      "2028-01-17",
      "2028-02-21",
      "2028-04-14",
      "2028-05-29",
      "2028-06-19",
      "2028-07-04",
      "2028-09-04",
      "2028-11-23",
      "2028-12-25",
    ];
    for (const date of dates)
      expect(at(`${date}T16:00:00Z`).status, date).toBe("Market Closed");
    expect(at("2027-12-31T16:00:00Z").status).toBe("Market Open");
    expect(at("2026-10-12T16:00:00Z").status).toBe("Market Open"); // Bank holiday, equities trade.
  });
  it("closes at 13:00 ET on every reviewed early-close date", () => {
    for (const date of [
      "2026-11-27",
      "2026-12-24",
      "2027-11-26",
      "2028-11-24",
    ]) {
      expect(at(`${date}T17:59:59Z`).status).toBe("Market Open");
      expect(at(`${date}T18:00:00Z`).status).toBe("Market Closed");
    }
    expect(at("2028-07-03T16:59:59Z").status).toBe("Market Open");
    expect(at("2028-07-03T17:00:00Z").status).toBe("Market Closed");
  });
  it("honors current provider exceptions, but not stale or future status", () => {
    const now = Date.parse("2026-10-19T14:00:00Z");
    const quote = {
      asOf: "2026-10-16T20:00:01Z",
      fetchedAt: "2026-10-19T13:59:00Z",
      state: "CLOSED",
    };
    expect(usEquityMarketStatus(now, [quote])).toMatchObject({
      status: "Market Closed",
      basis: "provider-state",
    });
    for (const fetchedAt of [
      "2026-10-19T13:54:00Z",
      "2026-10-19T14:01:00Z",
      "invalid",
    ])
      expect(
        usEquityMarketStatus(now, [{ ...quote, fetchedAt }]),
      ).toMatchObject({ status: "Market Open", basis: "calendar" });
    expect(
      usEquityMarketStatus(now, [{ ...quote, asOf: "2099-01-01T00:00:00Z" }])
        .basis,
    ).toBe("calendar");
    expect(
      usEquityMarketStatus(now, [{ ...quote, state: "UNKNOWN" }]).basis,
    ).toBe("calendar");
    expect(
      usEquityMarketStatus(Date.parse("2026-12-25T16:00:00Z"), [
        { ...quote, fetchedAt: "2026-12-25T15:59:00Z", state: "REGULAR" },
      ]).status,
    ).toBe("Market Closed");
  });
  it("validates session timestamps and honors provider early or delayed sessions", () => {
    const now = Date.parse("2026-10-19T18:00:00Z");
    const quote = {
      asOf: "2026-10-19T16:00:00Z",
      fetchedAt: "2026-10-19T16:00:00Z",
      sessionStart: Date.parse("2026-10-19T13:30:00Z") / 1000,
      sessionEnd: Date.parse("2026-10-19T17:00:00Z") / 1000,
    };
    expect(usEquityMarketStatus(now, [quote])).toMatchObject({
      status: "Market Closed",
      basis: "provider-session",
    });
    const delayed = {
      ...quote,
      asOf: "2026-10-19T13:30:00Z",
      fetchedAt: "2026-10-19T13:30:00Z",
      sessionStart: Date.parse("2026-10-19T14:30:00Z") / 1000,
      sessionEnd: Date.parse("2026-10-19T20:00:00Z") / 1000,
    };
    expect(
      usEquityMarketStatus(Date.parse("2026-10-19T14:00:00Z"), [delayed]),
    ).toMatchObject({ status: "Market Closed", basis: "provider-session" });
    expect(
      usEquityMarketStatus(Date.parse("2026-10-19T14:30:00Z"), [delayed]),
    ).toMatchObject({ status: "Market Open", basis: "provider-session" });
    for (const sessionEnd of [NaN, Infinity, 1e30, 0, quote.sessionStart - 1])
      expect(usEquityMarketStatus(now, [{ ...quote, sessionEnd }]).basis).toBe(
        "calendar",
      );
    expect(
      usEquityMarketStatus(now, [
        {
          ...quote,
          sessionStart: Date.parse("2026-10-16T13:30:00Z") / 1000,
          sessionEnd: Date.parse("2026-10-16T20:00:00Z") / 1000,
        },
      ]).status,
    ).toBe("Market Open");
  });
  it("does not guess unreviewed future holidays or crash on an invalid clock", () => {
    expect(at("2030-01-02T16:00:00Z").status).toBe("Market status unavailable");
    expect(usEquityMarketStatus(NaN).status).toBe("Market status unavailable");
    const now = Date.parse("2030-01-02T16:00:00Z");
    expect(
      usEquityMarketStatus(now, [
        {
          asOf: "2030-01-02T15:59:00Z",
          fetchedAt: "2030-01-02T15:59:00Z",
          state: "REGULAR",
        },
      ]).status,
    ).toBe("Market Open");
  });
});
