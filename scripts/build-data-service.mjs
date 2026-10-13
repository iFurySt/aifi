import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
mkdirSync(resolve(root, "apps/desktop/dist"), { recursive: true });
execFileSync(
  "go",
  [
    "build",
    "-mod=readonly",
    "-o",
    resolve(
      root,
      "apps/desktop/dist",
      process.platform === "win32" ? "aifi.exe" : "aifi",
    ),
    "./cmd/aifi",
  ],
  {
    cwd: resolve(root, "apps/cli"),
    env: { ...process.env, CGO_ENABLED: "0", GOWORK: "off" },
    stdio: "inherit",
  },
);
