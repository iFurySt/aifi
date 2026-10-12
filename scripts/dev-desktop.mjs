import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
await import("./build-desktop.mjs");
const web = spawn("pnpm", ["--filter", "@aifi/web", "dev"], {
  cwd: root,
  stdio: "inherit",
});
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
    const response = await fetch("http://127.0.0.1:5173");
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* Vite is starting. */
  }
  await delay(100);
}
if (!ready) {
  console.error("The local renderer did not start within 10 seconds.");
  stop(1);
} else if (!stopping) {
  desktop = spawn(require("electron"), [resolve(root, "apps/desktop")], {
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
