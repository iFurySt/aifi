import type { StockLogo } from "@aifi/core";

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
    canvas.width = canvas.height = 24;
    const context = canvas.getContext("2d");
    if (!context) return result;
    context.drawImage(image, 0, 0, 24, 24);
    const pixels = context.getImageData(0, 0, 24, 24).data;
    let visible = 0,
      white = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3]! <= 32) continue;
      visible++;
      if (Math.min(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 224) white++;
    }
    if (!visible || (visible > 550 && white === visible)) return null;
    result.light = white / visible > 0.95;
  } catch {
    // A decoded PNG remains usable if optional contrast sampling fails.
  }
  return result;
}
