import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
await import("./build-desktop.mjs");
// Resolve/download Electron before starting a server we would otherwise orphan.
const electronPath = require("electron");
// Spawn Vite directly so this process owns the server on all supported hosts.
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
  {
    cwd: resolve(root, "apps/web"),
    stdio: "inherit",
  },
);
let desktop;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  desktop?.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
web.on("error", (error) => {
  console.error(error.message);
  stop(1);
});
web.on("exit", (code) => stop(code ?? 1));
let ready = false;
for (let attempt = 0; attempt < 100 && !stopping; attempt++) {
  try {
    const response = await fetch("http://127.0.0.1:5173", {
      signal: AbortSignal.timeout(500),
    });
    if (response.ok && !stopping) {
      ready = true;
      break;
    }
  } catch {
    /* Vite is starting. */
  }
  await delay(100);
}
if (!ready && !stopping) {
  console.error("The local renderer did not start within the startup window.");
  stop(1);
} else if (!stopping) {
  desktop = spawn(electronPath, [resolve(root, "apps/desktop")], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, AIFI_DEV_URL: "http://127.0.0.1:5173" },
  });
  desktop.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  desktop.on("exit", (code) => stop(code ?? 0));
}
