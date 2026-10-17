export interface LogoBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const visible = (pixels: Uint8ClampedArray, index: number) =>
  pixels[index + 3]! > 32;
const white = (pixels: Uint8ClampedArray, index: number) =>
  pixels[index + 3]! >= 245 &&
  Math.min(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!) >= 245;

/** Trim only transparent/flat-white outer space; keep colored tiles and artwork. */
export function stockLogoBounds(
  pixels: Uint8ClampedArray,
  size: number,
): {
  bounds: LogoBounds;
  whiteBackground: boolean;
} {
  const full = { x: 0, y: 0, width: size, height: size };
  if (pixels.length !== size * size * 4 || size < 4)
    return { bounds: full, whiteBackground: false };
  const corners = [0, size - 1, size * (size - 1), size * size - 1];
  let whiteEdge = 0;
  for (let i = 0; i < size; i++) {
    for (const position of [
      i,
      (size - 1) * size + i,
      i * size,
      i * size + size - 1,
    ]) {
      if (white(pixels, position * 4)) whiteEdge++;
    }
  }
  const whiteBackground =
    corners.every((position) => white(pixels, position * 4)) &&
    whiteEdge / (size * 4) >= 0.95;
  let left = size,
    top = size,
    right = -1,
    bottom = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      if (!visible(pixels, index) || (whiteBackground && white(pixels, index)))
        continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return { bounds: full, whiteBackground };
  // One sample of breathing room preserves anti-aliased edges and soft shadows.
  left = Math.max(0, left - 1);
  top = Math.max(0, top - 1);
  right = Math.min(size - 1, right + 1);
  bottom = Math.min(size - 1, bottom + 1);
  const bounds = {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
  // Avoid extra PNG work for negligible borders or suspicious tiny specks.
  if (
    bounds.width < 4 ||
    bounds.height < 4 ||
    (bounds.width >= size - 2 && bounds.height >= size - 2)
  )
    return { bounds: full, whiteBackground };
  return { bounds, whiteBackground };
}
