import { expect, it } from "vitest";
import { stockLogoBounds } from "./stock-logo-bounds";
const size = 64;
function pixels(background = [0, 0, 0, 0]) {
  const result = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < result.length; i += 4) result.set(background, i);
  return result;
}
function rectangle(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  color = [20, 40, 60, 255],
) {
  for (let row = y; row < y + height; row++)
    for (let col = x; col < x + width; col++)
      data.set(color, (row * size + col) * 4);
}
it("normalizes transparent padding while retaining all edges and aspect", () => {
  const image = pixels();
  rectangle(image, 8, 18, 48, 28);
  expect(stockLogoBounds(image, size)).toEqual({
    bounds: { x: 7, y: 17, width: 50, height: 30 },
    whiteBackground: false,
  });
});
it("trims flat white borders but keeps white content inside the mark", () => {
  const image = pixels([255, 255, 255, 255]);
  rectangle(image, 16, 8, 32, 48);
  rectangle(image, 22, 14, 20, 36, [255, 255, 255, 255]);
  expect(stockLogoBounds(image, size)).toEqual({
    bounds: { x: 15, y: 7, width: 34, height: 50 },
    whiteBackground: true,
  });
});
it("preserves full colored tiles instead of trimming to their internal glyph", () => {
  const image = pixels([120, 20, 180, 255]);
  rectangle(image, 20, 20, 24, 24, [255, 255, 255, 255]);
  expect(stockLogoBounds(image, size)).toEqual({
    bounds: { x: 0, y: 0, width: size, height: size },
    whiteBackground: false,
  });
});
it("retains white transparent marks and artwork touching any side", () => {
  const image = pixels();
  rectangle(image, 0, 8, 44, 48, [255, 255, 255, 255]);
  const result = stockLogoBounds(image, size);
  expect(result.whiteBackground).toBe(false);
  expect(result.bounds).toEqual({ x: 0, y: 7, width: 45, height: 50 });
});
it("leaves empty, malformed and tiny speck bounds conservative", () => {
  const full = { x: 0, y: 0, width: size, height: size };
  expect(stockLogoBounds(pixels(), size).bounds).toEqual(full);
  const image = pixels();
  rectangle(image, 30, 30, 1, 1);
  expect(stockLogoBounds(image, size).bounds).toEqual(full);
  expect(stockLogoBounds(new Uint8ClampedArray(4), size).bounds).toEqual(full);
});
