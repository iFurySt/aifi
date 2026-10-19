import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/market-session");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/market-session.tsx"],
  outfile: join(output, "renderer.js"),
  bundle: true,
  format: "iife",
  jsx: "automatic",
  conditions: ["style", "browser"],
  define: { "process.env.NODE_ENV": '"development"' },
  alias: {
    "@aifi/core": join(root, "packages/core/src/index.ts"),
    "@aifi/platform": join(root, "packages/platform/src/index.ts"),
    react: join(root, "apps/web/node_modules/react"),
    "react-dom": join(root, "apps/web/node_modules/react-dom"),
  },
  loader: { ".png": "file", ".woff2": "file", ".svg": "file" },
  logLevel: "warning",
});
await writeFile(
  join(output, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="renderer.css"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>',
);
async function checks() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn) => {
    for (let i = 0; i < 150; i++) {
      if (fn()) return;
      await wait(20);
    }
    throw Error("Session UI timed out: " + fn.toString());
  };
  const assert = (v, m) => {
    if (!v) throw Error(m);
  };
  const status = () => document.querySelector(".stock-market-state");
  const price = () =>
    document
      .querySelector(".stock-quote-price strong")
      ?.textContent.replace(/\s/g, "");
  await until(() => status());
  assert(status().textContent === "Market Closed", "Premarket not closed");
  assert(price() === "$343.46", "Fixture price changed");
  window.marketFixture.now = Date.parse("2026-10-19T13:30:00Z");
  await until(() => status().textContent === "Market Open");
  assert(
    status().dataset.marketBasis === "calendar" && price() === "$343.46",
    "Open depended on a current price",
  );
  assert(
    status().title.includes("schedule"),
    "Schedule fallback not identified",
  );
  const move = async (time, event, expected) => {
    window.marketFixture.now = Date.parse(time);
    (event === "focus" ? window : document).dispatchEvent(new Event(event));
    await until(() => status().textContent === expected);
    assert(price() === "$343.46", "Clock changed persisted price");
  };
  await move("2026-10-19T20:00:00Z", "visibilitychange", "Market Closed");
  await move("2026-10-20T14:00:00Z", "focus", "Market Open");
  await move("2026-11-26T16:00:00Z", "visibilitychange", "Market Closed");
  assert(status().title.includes("holiday"), "Holiday closure not identified");
  await move("2026-11-27T17:59:59.900Z", "focus", "Market Open");
  window.marketFixture.now = Date.parse("2026-11-27T18:00:00Z");
  await until(() => status().textContent === "Market Closed");
  await move("2026-11-02T14:30:00Z", "focus", "Market Open");
  const clock = document.querySelector(".stock-exchange-clock");
  assert(
    clock.textContent.includes("9:30") && clock.textContent.includes("EST"),
    "Exchange clock did not recover with DST",
  );
  assert(
    !window.marketFixture.calls.some((m) =>
      /\.sync|collect|settings\.save/.test(m),
    ),
    "Status invoked collection",
  );
  return {
    staleFridayPrices: true,
    minuteOpenBoundary: true,
    earlyCloseBoundary: true,
    holiday: true,
    wakeFocus: true,
    visibilityRecovery: true,
    DST: true,
    unchangedPrices: true,
    noCollection: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1400,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'market-open.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(e){console.error(e);app.exit(1)}});setTimeout(()=>app.exit(1),15000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 20000);
const exit = await new Promise((r) =>
  child.once("exit", (code) => r(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  for (const name of ["report.json", "market-open.png"])
    await copyFile(join(output, name), join(reports, name));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
