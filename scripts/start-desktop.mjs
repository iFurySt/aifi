import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { desktopRuntime } from "./desktop-runtime.mjs";
const desktop = fileURLToPath(new URL("../apps/desktop", import.meta.url));
const child = spawn(desktopRuntime(), [desktop, ...process.argv.slice(2)], {
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error("AIFi could not start:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
