import type { StockLogo } from "@aifi/core";
import { stockLogoBounds } from "./stock-logo-bounds";

export interface PreparedStockLogo {
  url: string;
  light: boolean;
}
// Keys are the bounded repository's logo objects; eviction also frees preparation
// metadata. Concurrent rows sharing one logo share decode/contrast work.
const prepared = new WeakMap<StockLogo, PreparedStockLogo | null>();
const pending = new WeakMap<StockLogo, Promise<PreparedStockLogo | null>>();
export function peekPreparedStockLogo(logo: StockLogo) {
  return prepared.get(logo);
}
export function prepareStockLogo(
  logo: StockLogo,
): Promise<PreparedStockLogo | null> {
  if (prepared.has(logo)) return Promise.resolve(prepared.get(logo)!);
  const existing = pending.get(logo);
  if (existing) return existing;
  const work = decode(logo)
    .then((result) => {
      prepared.set(logo, result);
      return result;
    })
    .finally(() => pending.delete(logo));
  pending.set(logo, work);
  return work;
}
async function decode(logo: StockLogo): Promise<PreparedStockLogo | null> {
  if (!logo.dataUrl.startsWith("data:image/png;base64,")) return null;
  const image = new Image();
  image.src = logo.dataUrl;
  try {
    await image.decode();
    if (image.naturalWidth < 4 || image.naturalHeight < 4) return null;
  } catch {
    return null;
  }
  const result = { url: logo.dataUrl, light: false };
  try {
    const canvas = document.createElement("canvas");
    const size = 64;
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return result;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let visible = 0,
      white = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3]! <= 32) continue;
      visible++;
      if (Math.min(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 224) white++;
    }
    if (!visible || (visible > (pixels.length / 4) * 0.95 && white === visible))
      return null;
    const { bounds, whiteBackground } = stockLogoBounds(pixels, size);
    result.light = !whiteBackground && white / visible > 0.95;
    if (bounds.width < size || bounds.height < size) {
      const x = (bounds.x / size) * image.naturalWidth;
      const y = (bounds.y / size) * image.naturalHeight;
      const width = (bounds.width / size) * image.naturalWidth;
      const height = (bounds.height / size) * image.naturalHeight;
      // Crop once during cached preparation, never on render or scroll. Originals
      // remain intact in the host cache; derived PNGs stay bounded and local.
      if (width < 4 || height < 4) return result;
      const scale = Math.min(1, 128 / Math.max(width, height));
      const cropped = document.createElement("canvas");
      cropped.width = Math.max(1, Math.round(width * scale));
      cropped.height = Math.max(1, Math.round(height * scale));
      const croppedContext = cropped.getContext("2d");
      if (croppedContext) {
        croppedContext.drawImage(
          image,
          x,
          y,
          width,
          height,
          0,
          0,
          cropped.width,
          cropped.height,
        );
        const url = cropped.toDataURL("image/png");
        const decoded = new Image();
        decoded.src = url;
        await decoded.decode();
        result.url = url;
      }
    }
  } catch {
    // A decoded PNG remains usable if optional contrast sampling fails.
  }
  return result;
}
