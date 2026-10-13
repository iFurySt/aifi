import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
await import("./build-data-service.mjs");
const root = fileURLToPath(new URL("../", import.meta.url));
const web = spawn(
  process.execPath,
  [
    resolve(root, "node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort",
  ],
  { cwd: resolve(root, "apps/web"), stdio: "inherit" },
);
process.on("SIGINT", () => web.kill("SIGINT"));
process.on("SIGTERM", () => web.kill("SIGTERM"));
web.on("error", () => {
  console.error("AIFi Web could not start.");
  process.exitCode = 1;
});
web.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
