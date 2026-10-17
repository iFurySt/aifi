// Explicit full-directory audit/import. Never runs on app startup or page reads.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, writeFile, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2),
  options = {};
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--catalog", "--directory", "--output", "--import-cache"].includes(
      args[i],
    ) ||
    !args[i + 1] ||
    options[args[i]]
  )
    throw Error(
      "Use --catalog catalog-checkout --directory local-directory.json --output private-folder [--import-cache private-data-dir]",
    );
  options[args[i]] = resolve(args[i + 1]);
}
if (!["--catalog", "--directory", "--output"].every((k) => options[k]))
  throw Error("Missing audit paths.");
await mkdir(options["--output"], { recursive: true, mode: 0o700 });
const temp = await mkdtemp(join(options["--output"], "run-"));
await build({
  stdin: {
    contents:
      'export {StockLogoCache,validLogoPNG} from "./packages/host/src/stock-logos.ts";export {trustedLogoURL} from "./packages/host/src/public-assets.ts";',
    resolveDir: root,
  },
  outfile: join(temp, "host.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  logLevel: "warning",
});
await copyFile(
  join(root, "scripts/stock-logo-audit-worker.cjs"),
  join(temp, "worker.cjs"),
);
await writeFile(
  join(temp, "options.json"),
  JSON.stringify({ ...options, root }),
);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(temp, "worker.cjs"), "--no-sandbox"],
  { cwd: root, env, stdio: "inherit" },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 120000);
const code = await new Promise((resolve) =>
  child.once("exit", (c) => resolve(c ?? 1)),
);
clearTimeout(timeout);
process.exitCode = code;
