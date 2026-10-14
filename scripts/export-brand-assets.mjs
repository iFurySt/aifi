import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Noncreative size/format exports from the approved generated masters.
// Committed exports let normal builds run on every platform without these tools.
if (process.platform !== "darwin")
  throw Error("Brand exports currently require macOS sips.");
const assets = fileURLToPath(
  new URL("../packages/ui/src/assets/brand/", import.meta.url),
);
for (const [source, size, output] of [
  ["symbol-master.png", 256, "symbol-mask.png"],
  ["app-icon.png", 512, "app-icon-512.png"],
  ["app-icon.png", 64, "favicon-64.png"],
]) {
  execFileSync(
    "/usr/bin/sips",
    [
      "-z",
      String(size),
      String(size),
      join(assets, source),
      "--out",
      join(assets, output),
    ],
    { stdio: "ignore" },
  );
}
const bytes = readFileSync(join(assets, "symbol-mask.png"));
const size = bytes.readUInt32BE(16);
const mask = `<defs><mask id="symbol" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}" style="mask-type:alpha"><image width="${size}" height="${size}" href="data:image/png;base64,${bytes.toString("base64")}"/></mask></defs>`;
for (const [name, fill, bg] of [
  ["black", "#202020", null],
  ["white", "#FFFFFF", null],
  ["green", "#217A54", null],
  ["on-light", "#202020", "#F0F0F0"],
  ["on-dark", "#FFFFFF", "#202020"],
  ["on-green", "#217A54", "#EDF6F0"],
]) {
  const body = bg
    ? `<rect width="${size}" height="${size}" rx="37" fill="${bg}"/><g transform="translate(${size * 0.16} ${size * 0.16}) scale(.68)"><rect width="${size}" height="${size}" fill="${fill}" mask="url(#symbol)"/></g>`
    : `<rect width="${size}" height="${size}" fill="${fill}" mask="url(#symbol)"/>`;
  writeFileSync(
    join(assets, `symbol-${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${mask}${body}</svg>\n`,
  );
}
