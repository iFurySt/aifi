import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/stock-activity-ui");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/stock-activity.tsx"],
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
    throw Error("Activity UI timeout: " + fn.toString());
  };
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const table = () => document.querySelector(".activity-table table");
  const choose = async (label, text) => {
    document.querySelector(`[aria-label="${label}"]`).click();
    await until(() => !!document.querySelector("[role=listbox]"));
    [...document.querySelectorAll("[role=option]")]
      .find((x) => x.textContent === text)
      .click();
    await wait(40);
  };
  await until(() => table()?.querySelectorAll("tbody tr").length === 3);
  assert(
    table().textContent.includes("$1,001 - $15,000"),
    "Disclosed range collapsed into exact value",
  );
  assert(
    document.querySelectorAll(".politician-leaders button").length === 1,
    "Ambiguous rows included in leaders",
  );
  assert(
    document.querySelectorAll(".activity-buy-bar").length === 1 &&
      document.querySelectorAll(".activity-sell-bar").length === 1,
    "Trade count chart incorrect",
  );
  const svg = document.querySelector(".activity-chart svg");
  svg.focus();
  svg.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  await until(() => !!document.querySelector(".activity-chart-tooltip"));
  assert(
    document
      .querySelector(".activity-chart-tooltip")
      .textContent.includes("Cumulative net"),
    "Missing chart details",
  );
  await choose("Chamber", "House");
  assert(
    table().querySelectorAll("tbody tr").length === 2,
    "Chamber filter failed",
  );
  await choose("Chamber", "All chambers");
  document.querySelector(".politician-leaders button").click();
  await until(() => table().querySelectorAll("tbody tr").length === 1);
  assert(
    table().textContent.includes("Example Buyer"),
    "Actor selection failed",
  );
  document.querySelector(".politician-leaders button").click();
  await until(() => table().querySelectorAll("tbody tr").length === 3);
  window.activityFixture.empty();
  await until(() => !document.querySelector(".activity-chart svg"));
  assert(
    table().textContent.includes("Not collected"),
    "Missing state not explicit",
  );
  window.activityFixture.restore();
  await until(() => !!document.querySelector(".activity-chart svg"));
  return {
    reportedRanges: true,
    ambiguousExclusion: true,
    chart: true,
    keyboardTooltip: true,
    chamberFilter: true,
    actorSelection: true,
    missingState: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'activity.png'),(await win.webContents.capturePage()).toPNG());win.setSize(390,844);await new Promise(r=>setTimeout(r,120));const narrow=await win.webContents.executeJavaScript("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.activity-table .table-scroll').scrollWidth>document.querySelector('.activity-table .table-scroll').clientWidth");if(!narrow)throw Error('Narrow Activity overflow escaped the table');fs.writeFileSync(path.join(__dirname,'activity-mobile.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Activity UI check timed out');app.exit(1)},25000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 30000);
const exit = await new Promise((resolve) =>
  child.once("exit", (code) => resolve(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  await copyFile(join(output, "report.json"), join(reports, "report.json"));
  await copyFile(join(output, "activity.png"), join(reports, "activity.png"));
  await copyFile(
    join(output, "activity-mobile.png"),
    join(reports, "activity-mobile.png"),
  );
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
