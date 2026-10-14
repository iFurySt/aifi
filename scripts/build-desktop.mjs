import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
await import("./build-data-service.mjs");
await build({
  entryPoints: {
    main: resolve(root, "apps/desktop/src/main.ts"),
    preload: resolve(root, "apps/desktop/src/preload.ts"),
  },
  outdir: resolve(root, "apps/desktop/dist"),
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  outExtension: { ".js": ".cjs" },
});

const brandDir = resolve(root, "apps/desktop/dist/brand");
mkdirSync(brandDir, { recursive: true });
copyFileSync(
  resolve(root, "packages/ui/src/assets/brand/app-icon-512.png"),
  resolve(brandDir, "app-icon.png"),
);
