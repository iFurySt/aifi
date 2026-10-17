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
  const graph = () => document.querySelector(".fund-history-chart svg");
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
    document.querySelector(".funds-ownership").textContent.includes("66.35%") &&
      document.querySelector(".funds-ownership").textContent.includes("7,695"),
    "Aggregate ownership is lost",
  );
  assert(
    table().querySelectorAll("tbody tr").length === 3,
    "Current and earlier samples missing",
  );
  assert(
    graph().querySelectorAll("rect").length === 1,
    "Unobserved history was manufactured",
  );
  await choose("Select fund", "Alpha manager");
  await until(() => graph().querySelectorAll("rect").length === 3);
  assert(
    table().querySelector(".fund-selected-row").dataset.holder ===
      "Alpha manager",
    "Selector/table selection mismatch",
  );
  await choose("Position filter", "Added");
  await until(() => table().querySelectorAll("tbody tr").length === 1);
  assert(
    table().textContent.includes("Alpha manager") &&
      !table().textContent.includes("Beta manager"),
    "Position filtering failed",
  );
  await choose("Position filter", "All positions");
  input(document.querySelector('[aria-label="Search holders"]'), "Beta");
  await until(
    () =>
      table().querySelectorAll("tbody tr").length === 1 &&
      !table().textContent.includes("Alpha manager"),
  );
  table().querySelector(".fund-name").click();
  await until(() => graph().querySelectorAll("rect").length === 1);
  input(document.querySelector('[aria-label="Search holders"]'), "");
  await until(() => table().querySelectorAll("tbody tr").length === 3);
  assert(
    table()
      .querySelector('[data-holder="Earlier sample"]')
      .textContent.includes("Earlier sample"),
    "Sample disappearance became an exit",
  );
  graph().focus();
  graph().dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  await until(() => !!document.querySelector(".fund-chart-tooltip"));
  assert(
    document
      .querySelector(".fund-chart-tooltip")
      .textContent.includes("No collected observation"),
    "A history gap became zero",
  );
  button("Funds & ETFs").click();
  await until(() => table().textContent.includes("Aug 31, 2026"));
  assert(
    !table().textContent.includes("Q3 2026"),
    "Monthly fund date mislabeled as quarter-end",
  );
  assert(
    graph().querySelectorAll("rect").length === 2,
    "Fund history is missing",
  );
  graph().focus();
  graph().dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  await until(() => !!document.querySelector(".fund-chart-tooltip"));
  const tip = document
      .querySelector(".fund-chart-tooltip")
      .getBoundingClientRect(),
    host = document
      .querySelector(".fund-history-chart")
      .getBoundingClientRect();
  assert(
    tip.left >= host.left && tip.right <= host.right + 1,
    "Tooltip escapes chart",
  );
  await choose("Position filter", "New");
  await until(() => table().textContent.includes("No matching holders"));
  window.fundsFixture.zero();
  await choose("Position filter", "All positions");
  await until(() =>
    [...graph().querySelectorAll("rect")].every(
      (r) => r.getAttribute("height") === "1",
    ),
  );
  assert(
    !/NaN|Infinity/.test(graph().outerHTML),
    "Zero chart has invalid geometry",
  );
  window.fundsFixture.empty();
  await until(() => !graph());
  assert(
    table().textContent.includes("No data") ||
      table().textContent.includes("collect") ||
      table().textContent.includes("sync") ||
      table().textContent.includes("Sync"),
    "Missing data is not explicit",
  );
  window.fundsFixture.restore();
  await until(() => !!graph());
  button("Institutions").click();
  await until(() => !!table().querySelector('[data-holder="Alpha manager"]'));
  return {
    aggregateOwnership: true,
    separateHolderScopes: true,
    selectorTableChartSync: true,
    positionFilter: true,
    localSearch: true,
    unknownSampleAbsence: true,
    realMonthlyDates: true,
    noInventedHistory: true,
    keyboardTooltip: true,
    boundedTooltip: true,
    zeroChartFinite: true,
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
