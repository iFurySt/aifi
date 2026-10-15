import { it, expect, vi } from "vitest";
import { createLocalStockLogos } from "./stock-logos";
const logo = {
  dataUrl: "data:image/png;base64,YQ==",
  source: "fixture",
  fetchedAt: "2026-10-15T00:00:00Z",
};
it("keeps logo transport replaceable and missing images nullable", async () => {
  const transport = vi.fn().mockResolvedValue(null);
  const repository = createLocalStockLogos(transport);
  expect(await repository.get("AAPL")).toBeNull();
  expect(transport).toHaveBeenCalledWith("stock.logo", { symbol: "AAPL" });
  await expect(repository.get("<script>")).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
it("shares in-flight reads and reuses session images synchronously across consumers", async () => {
  let resolve!: (value: typeof logo) => void;
  const result = new Promise<typeof logo>((done) => {
    resolve = done;
  });
  const transport = vi.fn().mockReturnValue(result);
  const repository = createLocalStockLogos(transport);
  expect(repository.peek?.("AAPL")).toBeNull();
  const first = repository.get("aapl"),
    second = repository.get("AAPL");
  expect(transport).toHaveBeenCalledTimes(1);
  resolve(logo);
  expect(await first).toEqual(logo);
  expect(await second).toEqual(logo);
  expect(repository.peek?.("aapl")).toEqual(logo);
  expect(await repository.get("AAPL")).toEqual(logo);
  expect(transport).toHaveBeenCalledTimes(1);
  const another = createLocalStockLogos(vi.fn().mockResolvedValue(null));
  expect(another.peek?.("AAPL")).toBeNull();
});
it("briefly caches missing images but allows retry after expiry or a transport error", async () => {
  vi.useFakeTimers();
  try {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Error("busy"))
      .mockResolvedValue(logo);
    const repository = createLocalStockLogos(transport);
    expect(await repository.get("AAPL")).toBeNull();
    expect(await repository.get("AAPL")).toBeNull();
    expect(transport).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30001);
    await expect(repository.get("AAPL")).rejects.toThrow("busy");
    expect(await repository.get("AAPL")).toEqual(logo);
    expect(transport).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
  }
});
it("retains an expired session image during bridge failure and later accepts a refreshed image", async () => {
  vi.useFakeTimers();
  try {
    const updated = { ...logo, dataUrl: "data:image/png;base64,Yg==" };
    const transport = vi
      .fn()
      .mockResolvedValueOnce(logo)
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValue(updated);
    const repository = createLocalStockLogos(transport);
    await repository.get("AAPL");
    vi.advanceTimersByTime(5 * 60000 + 1);
    expect(repository.peek?.("AAPL")).toEqual(logo);
    expect(await repository.get("AAPL")).toEqual(logo);
    expect(await repository.get("AAPL")).toEqual(updated);
    expect(repository.peek?.("AAPL")).toEqual(updated);
  } finally {
    vi.useRealTimers();
  }
});
it("bounds session entries and image bytes without affecting another repository", async () => {
  const transport = vi.fn().mockResolvedValue(logo);
  const repository = createLocalStockLogos(transport);
  for (let i = 0; i < 129; i++) await repository.get(`A${i}`);
  expect(repository.peek?.("A0")).toBeNull();
  expect(repository.peek?.("A128")).toEqual(logo);
  const large = { ...logo, dataUrl: "x".repeat(1024 * 1024) };
  const limited = createLocalStockLogos(vi.fn().mockResolvedValue(large));
  for (let i = 0; i < 9; i++) await limited.get(`B${i}`);
  expect(limited.peek?.("B0")).toBeNull();
  expect(limited.peek?.("B8")).toEqual(large);
  expect(repository.peek?.("A128")).toEqual(logo);
});
it("warms disk hits as one bounded batch without treating cache misses as provider misses", async () => {
  const transport = vi
    .fn()
    .mockResolvedValueOnce([{ symbol: "AAPL", logo }])
    .mockResolvedValue(null);
  const repository = createLocalStockLogos(transport);
  expect(await repository.getCached!(["aapl", "AAPL", "MISSING"])).toEqual([
    { symbol: "AAPL", logo },
  ]);
  expect(transport).toHaveBeenCalledWith("stock.logos.cached", {
    symbols: ["AAPL", "MISSING"],
  });
  expect(repository.peek?.("AAPL")).toBe(logo);
  await repository.getCached!(["AAPL"]);
  await repository.get("AAPL");
  expect(transport).toHaveBeenCalledTimes(1);
  await repository.get("MISSING");
  expect(transport).toHaveBeenLastCalledWith("stock.logo", {
    symbol: "MISSING",
  });
  await expect(repository.getCached!(["../private"])).rejects.toThrow();
  await expect(repository.getCached!(Array(51).fill("AAPL"))).rejects.toThrow();
});
