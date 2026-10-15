import { afterEach, expect, it, vi } from "vitest";
import { prepareStockLogo, peekPreparedStockLogo } from "./stock-logo-image";
const logo = () => ({
  dataUrl: "data:image/png;base64,fixture",
  source: "fixture",
  fetchedAt: "2026-10-15T00:00:00Z",
});
function environment(
  options: {
    decode?: () => Promise<void>;
    size?: number;
    pixels?: Uint8ClampedArray;
    canvasError?: boolean;
  } = {},
) {
  const decode = vi.fn(options.decode ?? (() => Promise.resolve()));
  const create = vi.fn();
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      naturalWidth = options.size ?? 8;
      naturalHeight = options.size ?? 8;
      decode = decode;
      constructor() {
        create();
      }
    },
  );
  vi.stubGlobal("document", {
    createElement: () => {
      if (options.canvasError) throw Error("no canvas");
      return {
        getContext: () => ({
          drawImage: () => {},
          getImageData: () => ({
            data: options.pixels ?? new Uint8ClampedArray([20, 30, 40, 255]),
          }),
        }),
      };
    },
  });
  return { decode, create };
}
afterEach(() => vi.unstubAllGlobals());
it("waits for decoding, shares preparation and remembers white-mark contrast before display", async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const env = environment({
    decode: () => waiting,
    pixels: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]),
  });
  const item = logo();
  expect(peekPreparedStockLogo(item)).toBeUndefined();
  const first = prepareStockLogo(item),
    second = prepareStockLogo(item);
  expect(first).toBe(second);
  expect(env.decode).toHaveBeenCalledTimes(1);
  let done = false;
  void first.then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  release();
  expect(await first).toEqual({ url: item.dataUrl, light: true });
  expect(peekPreparedStockLogo(item)).toEqual({
    url: item.dataUrl,
    light: true,
  });
  await prepareStockLogo(item);
  expect(env.create).toHaveBeenCalledTimes(1);
});
it("settles corrupt, tiny, transparent and blank white images as unavailable", async () => {
  environment({ decode: () => Promise.reject(Error("bad PNG")) });
  expect(await prepareStockLogo(logo())).toBeNull();
  environment({ size: 1 });
  expect(await prepareStockLogo(logo())).toBeNull();
  environment({ pixels: new Uint8ClampedArray(24 * 24 * 4) });
  expect(await prepareStockLogo(logo())).toBeNull();
  environment({ pixels: new Uint8ClampedArray(24 * 24 * 4).fill(255) });
  expect(await prepareStockLogo(logo())).toBeNull();
});
it("does not decode unsupported URLs and retains decoded images when optional canvas sampling fails", async () => {
  const env = environment({ canvasError: true });
  expect(
    await prepareStockLogo({
      ...logo(),
      dataUrl: "https://example.com/logo.svg",
    }),
  ).toBeNull();
  expect(env.create).not.toHaveBeenCalled();
  const item = logo();
  expect(await prepareStockLogo(item)).toEqual({
    url: item.dataUrl,
    light: false,
  });
});
