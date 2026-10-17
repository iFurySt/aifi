import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/funds-ui");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/funds.tsx"],
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
    throw Error("Funds UI timeout: " + fn.toString());
  };
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const table = () => document.querySelector(".funds-table");
  const graph = () => document.querySelector(".fund-ring-wrap svg");
  const sectors = () => graph()?.querySelectorAll(".fund-ring-sector").length;
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === text,
    );
  const choose = async (label, text) => {
    document.querySelector(`[aria-label="${label}"]`).click();
    await until(() => !!document.querySelector('[role="listbox"]'));
    [...document.querySelectorAll('[role="option"]')]
      .find((o) => o.textContent === text)
      .click();
    await until(() => !document.querySelector('[role="listbox"]'));
  };
  const input = (el, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  await until(() => table() && graph());
  assert(
    document.querySelector(".funds-ownership").textContent.includes("66.35%"),
    "Aggregate ownership lost",
  );
  assert(
    table().querySelectorAll("tbody tr").length === 3 && sectors() === 2,
    "Sample scope or latest-period ring incorrect",
  );
  await choose("Select fund", "Alpha manager");
  await until(
    () =>
      table().querySelector(".fund-selected-row").dataset.holder ===
      "Alpha manager",
  );
  await choose("Position filter", "Added");
  await until(() => table().querySelectorAll("tbody tr").length === 1);
  await choose("Position filter", "All positions");
  input(document.querySelector('[aria-label="Search holders"]'), "Beta");
  await until(
    () =>
      table().querySelectorAll("tbody tr").length === 1 &&
      table().textContent.includes("Beta manager"),
  );
  input(document.querySelector('[aria-label="Search holders"]'), "");
  await until(() => table().querySelectorAll("tbody tr").length === 3);
  button("Funds & ETFs").click();
  await until(() => table().textContent.includes("Aug 31, 2026"));
  assert(!table().textContent.includes("Q3 2026"), "Monthly date mislabeled");
  window.fundsFixture.zero();
  await until(() => sectors() === 0);
  assert(!/NaN|Infinity/.test(graph().outerHTML), "Invalid zero geometry");
  button("Institutions").click();
  window.fundsFixture.history();
  await until(() => table().querySelectorAll("thead th").length === 16);
  assert(sectors() === 3, "Zero/missing holdings included in ring");
  assert(
    table().querySelector('[data-holder="New manager"] .fund-position')
      .textContent === "New",
    "Proven new position missing",
  );
  assert(
    table().querySelector('[data-holder="Exited manager"] .fund-position')
      .textContent === "Exited",
    "Proven exit missing",
  );
  assert(
    table().querySelector('[data-holder="Gap manager"] .fund-position')
      .textContent === "—",
    "Gap interpreted as a trade",
  );
  await choose("Select fund", "Alpha manager");
  await until(() =>
    document
      .querySelector(".fund-ring-center")
      .textContent.includes("3Shares added"),
  );
  graph().focus();
  graph().dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  await until(
    () =>
      table().querySelector(".fund-selected-row").dataset.holder !==
      "Alpha manager",
  );
  const sector = graph().querySelector(".fund-ring-sector");
  sector.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await until(() => !!document.querySelector(".fund-ring-tooltip"));
  assert(
    document
      .querySelector(".fund-ring-tooltip")
      .textContent.includes("of tracked holdings"),
    "Ownership denominator unclear",
  );
  await choose("Reporting period", "Q1 2026");
  await until(() =>
    document.querySelector(".fund-ring-center").textContent.includes("Q1 2026"),
  );
  assert(sectors() === 2, "Historical ring failed");
  window.fundsFixture.empty();
  await until(() => !graph());
  assert(
    /data|collect|sync/i.test(table().textContent),
    "Missing data unclear",
  );
  window.fundsFixture.history();
  await until(() => !!graph());
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await choose("Select fund", "Alpha manager");
  await wait(100);
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  graph().dispatchEvent(
    new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
  );
  return {
    aggregateOwnership: true,
    holderScopes: true,
    selectorTableRingSync: true,
    filters: true,
    realMonthlyDates: true,
    zeroFinite: true,
    fourteenQuarters: true,
    provenNewExit: true,
    gapsRemainUnknown: true,
    exactDelta: true,
    keyboardSelection: true,
    ringTooltip: true,
    periodSelection: true,
    missingData: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'funds.png'),(await win.webContents.capturePage()).toPNG());win.setSize(390,844);await new Promise(r=>setTimeout(r,120));const narrow=await win.webContents.executeJavaScript("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.funds-table-scroll').scrollWidth>document.querySelector('.funds-table-scroll').clientWidth");if(!narrow)throw Error('Narrow Funds overflow escaped the table');fs.writeFileSync(path.join(__dirname,'funds-mobile.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Funds UI check timed out');app.exit(1)},25000);`;
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
  await copyFile(join(output, "funds.png"), join(reports, "funds.png"));
  await copyFile(
    join(output, "funds-mobile.png"),
    join(reports, "funds-mobile.png"),
  );
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
