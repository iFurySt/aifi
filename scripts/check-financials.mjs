import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/financials-ui");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/financials.tsx"],
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
    throw Error("Financial UI check timed out: " + fn.toString());
  };
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const table = () => document.querySelector(".financial-data-table");
  const graph = () => document.querySelector(".financial-trend svg");
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === text,
    );
  const selectView = (value) => {
    const select = document.querySelector('[aria-label="Financial view"]');
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  await until(() => table() && graph());
  assert(
    table().querySelectorAll("thead th").length === 21,
    "Quarter history is not 20 periods",
  );
  assert(
    graph().querySelectorAll("rect").length === 40,
    "Chart did not retain every stored period",
  );
  assert(
    table().querySelectorAll(".financial-group-row").length === 6,
    "Financial groups are incomplete",
  );
  const income = button("Income statement15");
  assert(!!income, "Income group is missing");
  income.click();
  await until(
    () => !!table().querySelector('[data-metric="weightedSharesBasic"]'),
  );
  const shares = table().querySelector(
    '[data-metric="weightedSharesBasic"] td',
  ).textContent;
  assert(
    shares === "100" && !shares.includes("$"),
    "Weighted shares are shown as dollars",
  );
  const computed = table().querySelector(
    '[data-metric="costOfRevenue"] td span',
  );
  assert(
    computed.title.includes("Calculated") && computed.textContent.includes("*"),
    "Derived statement values lack provenance",
  );
  const scroll = document.querySelector(".financial-table-panel .table-scroll");
  scroll.scrollLeft = 400;
  button("Balance sheet28").click();
  await until(
    () => !!table().querySelector('[data-metric="currentLiabilities"]'),
  );
  assert(scroll.scrollLeft === 400, "Group expansion reset horizontal scroll");
  button("Yearly").click();
  await until(() => table().querySelectorAll("thead th").length === 7);
  assert(
    !table().querySelector("thead").textContent.includes("Mar"),
    "Annual balance view includes quarterly instants",
  );
  button("Quarter").click();
  await until(() => table().querySelectorAll("thead th").length === 21);
  document.querySelector('[aria-label="Chart Diluted EPS"]').click();
  await until(
    () =>
      document.querySelector(".financial-trend-legend").textContent ===
      "Diluted EPS",
  );
  assert(
    graph().querySelectorAll("rect").length === 20,
    "Different units were mixed on one scale",
  );
  graph().focus();
  graph().dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
  );
  await until(() => !!document.querySelector(".financial-trend-tooltip"));
  assert(
    document
      .querySelector(".financial-trend-tooltip")
      .textContent.includes("Diluted EPS"),
    "Tooltip has no selected metric",
  );
  selectView("derived");
  await until(() => !!table().querySelector('[data-metric="peRatio"]'));
  assert(
    table().querySelector('[data-metric="peRatio"] td').textContent === "—",
    "Historical valuation was invented",
  );
  selectView("kpi");
  await until(
    () =>
      !!table().querySelector(
        '[data-metric="manufacturingPurchaseObligations"]',
      ),
  );
  assert(
    table().querySelector('[data-metric="manufacturingPurchaseObligations"] td')
      .textContent === "—",
    "Custom KPI was fabricated",
  );
  window.financialFixture.zero();
  await until(() =>
    [...graph().querySelectorAll("rect")].every(
      (rect) => Number(rect.getAttribute("height")) === 1,
    ),
  );
  assert(
    !/NaN|Infinity/.test(graph().outerHTML),
    "Zero history produced an invalid axis",
  );
  return {
    twentyQuarterHistory: true,
    sixFinancialGroups: true,
    allChartBars: true,
    shareUnits: true,
    calculationProvenance: true,
    annualBalanceAlignment: true,
    horizontalScrollPreserved: true,
    singleUnitChart: true,
    keyboardTooltip: true,
    valuationAndKPIGaps: true,
    zeroAxisFinite: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'financials.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Financial UI check timed out');app.exit(1)},25000);`;
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
  await copyFile(
    join(output, "financials.png"),
    join(reports, "financials.png"),
  );
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
