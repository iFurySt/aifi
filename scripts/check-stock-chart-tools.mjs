import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/stock-chart-tools");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/stock-chart-tools.tsx"],
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
async function checks(phase) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (v, message) => {
    if (!v) throw Error(message);
  };
  const until = async (fn) => {
    for (let i = 0; i < 160; i++) {
      if (fn()) return;
      await wait(20);
    }
    throw Error("Chart tools timed out: " + fn.toString());
  };
  const button = (label) =>
    document.querySelector(`button[aria-label="${label}"]`);
  const close = async () => {
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    await wait(40);
  };
  const chooseRange = async (name) => {
    button("Price range").click();
    await until(() => document.querySelector('[role="option"]'));
    [...document.querySelectorAll('[role="option"]')]
      .find((e) => e.textContent === name)
      .click();
    await wait(40);
  };
  const add = async (ticker) => {
    button("Compare stocks").click();
    await until(() =>
      document.querySelector('[aria-label="Find comparison stock"]'),
    );
    const input = document.querySelector(
      '[aria-label="Find comparison stock"]',
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, ticker);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await until(() =>
      [...document.querySelectorAll(".stock-compare-option")].some(
        (e) => e.querySelector("strong").textContent === ticker,
      ),
    );
    [...document.querySelectorAll(".stock-compare-option")]
      .find((e) => e.querySelector("strong").textContent === ticker)
      .click();
    await close();
  };
  await until(() => document.querySelector(".stock-price-chart"));
  if (phase === "core") {
    const watch = document.querySelector(".stock-watch-button");
    assert(
      !watch.textContent.trim() &&
        watch.querySelector("svg") &&
        watch.closest(".stock-company-title"),
      "Watch is not an inline icon",
    );
    const pressed = watch.getAttribute("aria-pressed");
    watch.click();
    await wait(40);
    assert(
      watch.getAttribute("aria-pressed") !== pressed,
      "Watch action broken",
    );
    watch.click();
    await wait(40);
    const tab = document.querySelector(".stock-tabs button");
    assert(
      parseFloat(getComputedStyle(tab).paddingLeft) > 4 &&
        parseFloat(getComputedStyle(tab.parentElement).gap) > 8,
      "Tabs have no inset hover spacing",
    );
    const controls = document.querySelector(".stock-chart-controls");
    assert(
      controls.children[0] === button("Price range") &&
        controls.children[1].getAttribute("aria-label") === "Chart style" &&
        controls.children[2].textContent === "YAHOO",
      "Chart toolbar order differs",
    );
    assert(
      !document.querySelector(".stock-chart-readout") &&
        !document.body.innerText.includes("Daily OHLCV"),
      "Redundant chart prose remains",
    );
    await chooseRange("YTD");
    assert(
      document
        .querySelector(".stock-price-chart")
        .getAttribute("aria-label")
        .includes("YTD"),
      "Range not applied",
    );
    await chooseRange("1Y");
    button("Indicators").dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
        button: 0,
        ctrlKey: false,
      }),
    );
    await until(() => document.querySelector('[role="menuitemcheckbox"]'));
    assert(
      document.querySelectorAll('[role="menuitemcheckbox"]').length === 3,
      "Wrong indicator choices",
    );
    for (const e of document.querySelectorAll('[role="menuitemcheckbox"]'))
      e.click();
    await close();
    await until(() => document.querySelectorAll("[data-study]").length === 3);
    const paths = [...document.querySelectorAll("[data-study]")];
    assert(
      paths.every((p) => p.getAttribute("points").split(" ").length > 300),
      "SMA lost pre-window warmup",
    );
    document
      .querySelector('[aria-label="Chart style"] button:last-child')
      .click();
    await until(() => document.querySelector(".stock-candle-bar"));
    assert(
      document.querySelectorAll("[data-study]").length === 3,
      "Studies lost in candle mode",
    );
    document
      .querySelector('[aria-label="Chart style"] button:first-child')
      .click();
    await add("MSFT");
    await until(() =>
      button("Remove comparison MSFT")?.querySelector(".skeleton"),
    );
    assert(
      document.querySelector(".stock-price-chart") &&
        !document.querySelector("[data-comparison]"),
      "Pending peer displaced the chart",
    );
    window.chartFixture.release();
    await until(() => document.querySelector('[data-comparison="MSFT"]'));
    assert(
      [...document.querySelectorAll(".stock-price-chart text")].some((e) =>
        e.textContent.includes("%"),
      ),
      "Comparison does not use return axis",
    );
    const svg = document.querySelector(".stock-price-chart");
    svg.focus();
    svg.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "End",
        bubbles: true,
        cancelable: true,
      }),
    );
    await until(() => document.querySelector(".stock-chart-tooltip"));
    const tooltip = document.querySelector(".stock-chart-tooltip");
    assert(
      ["Open", "High", "Low", "Close", "MSFT", "SMA200"].every((t) =>
        tooltip.textContent.includes(t),
      ),
      "Hover lost OHLC/studies/comparison",
    );
    assert(
      tooltip.getBoundingClientRect().bottom <=
        svg.getBoundingClientRect().bottom + 1,
      "Tooltip extends beyond chart",
    );
    svg.blur();
    await add("BAD");
    await until(() =>
      [...document.querySelectorAll(".stock-compare-status")].some((e) =>
        e.textContent.includes("BAD · No stored prices"),
      ),
    );
    assert(
      document.querySelector('[data-comparison="MSFT"]'),
      "Missing peer hid valid comparison",
    );
    button("Remove comparison BAD").click();
    await wait(30);
    await add("RAW");
    await until(() =>
      [...document.querySelectorAll(".stock-compare-status")].some((e) =>
        e.textContent.includes("Split-adjusted prices needed"),
      ),
    );
    button("Remove comparison RAW").click();
    await wait(30);
    controls
      .querySelector(".research-source-chip")
      .dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "mouse",
          button: 0,
          ctrlKey: false,
        }),
      );
    await until(() => document.querySelector(".research-source-popup"));
    assert(
      document
        .querySelector(".research-source-popup")
        .textContent.includes("Split-adjusted"),
      "Basis metadata disappeared",
    );
    await close();
    assert(
      !window.chartFixture.dataCalls.length,
      "Chart interaction called collection/actions",
    );
    assert(
      window.chartFixture.reads.filter((s) => s === "MSFT").length === 1,
      "Comparison did not reuse the local research cache",
    );
    return {
      inlineWatch: true,
      insetTabs: true,
      toolbarOrder: true,
      rangePicker: true,
      SMAWarmup: true,
      candleStudies: true,
      comparisonReturns: true,
      loading: true,
      missingPrices: true,
      basisGuard: true,
      tooltip: true,
      metadata: true,
      localOnly: true,
    };
  }
  if (phase === "layout") {
    document
      .querySelector(".stock-price-chart")
      .dispatchEvent(
        new PointerEvent("pointerout", {
          bubbles: true,
          relatedTarget: document.body,
        }),
      );
    await wait(30);
    const main = document.querySelector(".stock-main");
    assert(
      main.scrollWidth <= main.clientWidth + 1,
      "Chart causes horizontal overflow",
    );
    const header = document.querySelector(".stock-company-header");
    assert(header.scrollWidth <= header.clientWidth + 1, "Header overflows");
    const controls = document.querySelector(".stock-chart-controls"),
      box = controls.getBoundingClientRect();
    assert(
      [...controls.children].every(
        (e) =>
          e.getBoundingClientRect().right <= box.right + 1 &&
          e.getBoundingClientRect().left >= box.left - 1,
      ),
      "Toolbar items clipped",
    );
    assert(
      getComputedStyle(controls).justifyContent === "flex-start",
      "Toolbar not left-aligned",
    );
    const mainBox = main.getBoundingClientRect();
    main.scrollTop =
      innerWidth >= 1280
        ? 0
        : main.scrollTop +
          document.querySelector(".stock-price-section").getBoundingClientRect()
            .top -
          mainBox.top -
          18;
    await wait(30);
    return {
      width: innerWidth,
      toolbarWrap: true,
      theme: document.documentElement.dataset.theme,
    };
  }
  if (phase === "remove") {
    button("Remove comparison MSFT").click();
    await until(() => !document.querySelector("[data-comparison]"));
    assert(
      ![...document.querySelectorAll(".stock-price-chart text")].some((e) =>
        e.textContent.includes("%"),
      ),
      "Removing comparisons did not restore prices",
    );
    return { removeRestoresPrices: true };
  }
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',e=>{if(e.level==='error')console.error(e.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const run=p=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(p)+')');const report=[await run('core')];for(const [width,theme] of [[1440,'light'],[1000,'dark'],[650,'light'],[390,'dark']]){win.setContentSize(width,1000);await win.webContents.executeJavaScript('document.documentElement.dataset.theme='+JSON.stringify(theme));await new Promise(r=>setTimeout(r,80));report.push(await run('layout'));fs.writeFileSync(path.join(__dirname,theme+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG());}report.push(await run('remove'));fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(e){console.error(e);fs.writeFileSync(path.join(__dirname,'failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1)}});setTimeout(()=>app.exit(1),30000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 35000);
const exit = await new Promise((r) =>
  child.once("exit", (code) => r(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  for (const name of [
    "report.json",
    "light-1440.png",
    "dark-1000.png",
    "light-650.png",
    "dark-390.png",
  ])
    await copyFile(join(output, name), join(reports, name));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
