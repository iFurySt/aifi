import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, writeFile, copyFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/stock-logo-delivery");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/stock-logo-delivery.tsx"],
  outfile: join(output, "renderer.js"),
  bundle: true,
  format: "iife",
  jsx: "automatic",
  conditions: ["browser"],
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@aifi/core": join(root, "packages/core/src/index.ts"),
    "@aifi/platform": join(root, "packages/platform/src/index.ts"),
    react: join(root, "apps/web/node_modules/react"),
    "react-dom": join(root, "apps/web/node_modules/react-dom"),
  },
  loader: { ".png": "file", ".svg": "file", ".woff2": "file" },
  logLevel: "warning",
});
await writeFile(
  join(output, "index.html"),
  '<!doctype html><div id="root"></div><script src="renderer.js"></script>',
);
async function check() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (condition) => {
    for (let i = 0; i < 300; i++) {
      if (condition()) return;
      await wait(20);
    }
    throw Error("Logo delivery check timed out: " + condition);
  };
  await until(() => document.querySelector(".stock-list"));
  const list = document.querySelector(".stock-list");
  // First visible row initially sees pressure and must retry without focus or
  // manual scroll. Later pages all mount into a bounded host request lane.
  await until(() => list.querySelector('[data-logo-state="ready"]'));
  await until(
    () =>
      window.logoDelivery.attempts.F0 >= 2 &&
      list.firstElementChild.querySelector("img"),
  );
  for (let top = 0; top <= list.scrollHeight; top += 220) {
    list.scrollTop = top;
    await wait(80);
  }
  await until(
    () => document.querySelectorAll('[data-logo-state="ready"]').length === 50,
  );
  if (window.logoDelivery.peak > 4) throw Error("Host request lane overflowed");
  list.scrollTop = 0;
  return {
    rows: 50,
    ready: 50,
    peak: window.logoDelivery.peak,
    pressureRetry: window.logoDelivery.attempts.F0,
  };
}
await writeFile(
  join(output, "main.cjs"),
  `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:600,height:500,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(check.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(e){console.error(e);app.exit(1)}});`,
);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, env, stdio: "inherit" },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 20000);
const code = await new Promise((resolve) =>
  child.once("exit", (c) => resolve(c ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (!code) {
  await copyFile(join(output, "report.json"), join(reports, "report.json"));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = code;
