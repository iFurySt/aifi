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
    cropUrl?: string;
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
        toDataURL: () => options.cropUrl ?? "data:image/png;base64,cropped",
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
it("crops padded artwork once before publishing the shared prepared image", async () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4).fill(255);
  for (let y = 12; y < 52; y++)
    for (let x = 12; x < 52; x++) pixels.set([0, 0, 0, 255], (y * 64 + x) * 4);
  const env = environment({
    size: 128,
    pixels,
    cropUrl: "data:image/png;base64,normalized",
  });
  const item = logo();
  expect(await prepareStockLogo(item)).toEqual({
    url: "data:image/png;base64,normalized",
    light: false,
  });
  expect(env.decode).toHaveBeenCalledTimes(2);
  expect(item.dataUrl).toBe("data:image/png;base64,fixture");
  await prepareStockLogo(item);
  expect(env.decode).toHaveBeenCalledTimes(2);
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
