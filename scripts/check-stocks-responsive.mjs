import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/stocks-responsive");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/stocks-responsive.tsx"],
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
async function checks(phase, width) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error(
      `${phase}/${width}: responsive check timed out: ` + check.toString(),
    );
  };
  const assert = (value, message) => {
    if (!value) throw Error(`${phase}/${width}: ${message}`);
  };
  const frame = () =>
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const main = () => document.querySelector(".stock-main");
  const input = () =>
    document.querySelector('.sidebar [aria-label="Filter stocks"]');
  const enter = (input, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const key = (key, target = window, primary = true) =>
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        metaKey: primary,
        bubbles: true,
        cancelable: true,
      }),
    );
  await until(() => main() && document.querySelector(".stock-price-chart"));
  if (phase === "setup") {
    enter(input(), "Fixture");
    await until(
      () => document.querySelectorAll(".sidebar .stock-list-row").length >= 50,
    );
    document.querySelector('[aria-label="Price range"]').click();
    await until(() => document.querySelector('[role="option"]'));
    [...document.querySelectorAll('[role="option"]')]
      .find((o) => o.textContent === "3M")
      .click();
    document
      .querySelector('[aria-label="Chart style"] button:nth-child(2)')
      .click();
    await frame();
    const list = document.querySelector(".sidebar .stock-list");
    list.scrollTop = 400;
    await frame();
    window.responsiveState = {
      chart: document.querySelector(".stock-price-chart"),
      list,
      scrollTop: list.scrollTop,
    };
    return { seeded: true };
  }
  await frame();
  const state = window.responsiveState;
  if (phase === "layout") {
    assert(
      main().scrollWidth <= main().clientWidth + 1,
      "Document overflows horizontally",
    );
    const header = document.querySelector(".stock-company-header");
    assert(
      header.scrollWidth <= header.clientWidth + 1,
      "Company header overflows",
    );
    for (const selector of [
      ".stock-company-about",
      ".stock-analyst-overview",
      ".stock-earnings-overview",
    ]) {
      const el = document.querySelector(selector);
      assert(
        getComputedStyle(el).display !== "none" &&
          el.getBoundingClientRect().height > 0,
        "Company section hidden: " + selector,
      );
    }
    if (state) {
      assert(
        document.querySelector(".stock-price-chart") === state.chart,
        "Resize remounted chart",
      );
      assert(
        document.querySelector('[aria-label="Price range"] .select-value')
          .textContent === "3M",
        "Range reset on resize",
      );
      assert(
        document.querySelector(
          '[aria-label="Chart style"] [aria-pressed="true"]',
        ).textContent === "Candle",
        "Chart style reset on resize",
      );
    }
    const sidebar = getComputedStyle(
      document.querySelector(".sidebar"),
    ).display;
    assert(
      width < 1280 === (sidebar === "none"),
      "Stocks sidebar breakpoint differs",
    );
    if (width < 1280)
      assert(
        document
          .querySelector('[aria-label="Open stock list"]')
          .getBoundingClientRect().width > 0,
        "Hidden stock list cannot reopen",
      );
    if (main().clientWidth <= 440) {
      const watch = header.querySelector(".button").getBoundingClientRect();
      assert(
        watch.width >= 40 && watch.height >= 40,
        "Watch touch target is too small",
      );
    }
    if (main().clientWidth <= 700) {
      const positions = [
        ".stock-quote",
        ".stock-company-about",
        ".stock-analyst-overview",
        ".stock-earnings-overview",
        ".stock-metrics-column",
        ".stock-price-section",
        ".stock-news-overview",
        ".stock-filings-overview",
      ].map((s) => document.querySelector(s).getBoundingClientRect().top);
      assert(
        positions.every((y, i) => i === 0 || y > positions[i - 1]),
        "Narrow section order differs",
      );
    }
    if (width === 1440 && state) {
      assert(
        document.querySelector(".sidebar .stock-list") === state.list,
        "Wide list remounted",
      );
      assert(
        Math.abs(state.list.scrollTop - state.scrollTop) <= 1,
        "List scroll lost after resize",
      );
      assert(input().value === "Fixture", "Stock filter lost after resize");
    }
    return {
      width,
      documentWidth: main().clientWidth,
      sidebar,
      allSectionsVisible: true,
      stableChart: !!state,
    };
  }
  if (phase === "drawer") {
    key("b");
    await until(() => !!document.querySelector(".stock-navigation-drawer"));
    const drawer = document.querySelector(".stock-navigation-drawer");
    const rect = drawer.getBoundingClientRect();
    assert(
      rect.left >= 0 &&
        rect.right <= innerWidth &&
        rect.top >= 0 &&
        rect.bottom <= innerHeight,
      "Drawer exceeds viewport",
    );
    const filter = drawer.querySelector('[aria-label="Filter stocks"]');
    assert(
      filter.value === "Fixture",
      "Drawer does not share the stock filter",
    );
    key("Escape", filter, false);
    await until(() => !document.querySelector(".stock-navigation-drawer"));
    assert(
      document.querySelector(".stock-price-chart") === state.chart,
      "Opening drawer remounted chart",
    );
    return { drawerKeyboard: true, filterShared: true, viewportBounded: true };
  }
  if (phase === "openDrawer") {
    const launcher = document.querySelector('[aria-label="Open stock list"]');
    launcher.focus();
    launcher.click();
    await until(() => !!document.querySelector(".stock-navigation-drawer"));
    return { drawerOpenForResize: true };
  }
  if (phase === "closeWideDrawer") {
    await until(() => !document.querySelector(".stock-navigation-drawer"));
    assert(
      document.activeElement?.id === "main-content",
      "Resize restored focus to a hidden drawer launcher",
    );
    return { drawerClosesOnWidening: true, visibleFocusRestored: true };
  }
  if (phase === "select") {
    document.querySelector('[aria-label="Open stock list"]').click();
    await until(() => !!document.querySelector(".stock-navigation-drawer"));
    enter(
      document.querySelector(
        '.stock-navigation-drawer [aria-label="Filter stocks"]',
      ),
      "Microsoft",
    );
    await until(
      () =>
        document.querySelectorAll(".stock-navigation-drawer .stock-list-row")
          .length === 1,
    );
    document.querySelector(".stock-navigation-drawer .stock-list-row").click();
    await until(
      () =>
        location.hash.includes("/MSFT") &&
        !document.querySelector(".stock-navigation-drawer"),
    );
    return { drawerSelectsAndDismisses: true };
  }
  if (phase === "preference") {
    document.querySelector('[aria-label="Collapse sidebar"]').click();
    await frame();
    assert(
      getComputedStyle(document.querySelector(".sidebar")).display === "none",
      "Wide collapse failed",
    );
    return { widePreferenceSet: true };
  }
  if (phase === "restorePreference") {
    assert(
      getComputedStyle(document.querySelector(".sidebar")).display === "none",
      "Automatic mode overwrote wide preference",
    );
    document.querySelector('[aria-label="Expand sidebar"]').click();
    await frame();
    return { widePreferenceRetained: true };
  }
  if (phase === "tabs") {
    for (const tab of [
      "chart",
      "financials",
      "funds",
      "politicians",
      "insiders",
      "analyst",
    ]) {
      document.querySelector(`#stock-tab-${tab}`).click();
      await until(() => document.querySelector(`#stock-panel-${tab}`));
      await frame();
      assert(
        main().scrollWidth <= main().clientWidth + 1,
        tab + " makes document overflow",
      );
      const strip = document
          .querySelector(".stock-tabs")
          .getBoundingClientRect(),
        selected = document
          .querySelector(`#stock-tab-${tab}`)
          .getBoundingClientRect();
      assert(
        selected.left >= strip.left - 1 && selected.right <= strip.right + 1,
        "Selected tab is not revealed: " + tab,
      );
      const table = document.querySelector(".table-scroll");
      if (table) {
        assert(
          table.clientWidth <= main().clientWidth,
          "Table is not contained",
        );
        if (table.scrollWidth > table.clientWidth) {
          table.scrollLeft = 60;
          assert(table.scrollLeft > 0, tab + " table cannot scroll locally");
          table.scrollLeft = 0;
        }
      }
      const body = document.querySelector(`#stock-panel-${tab}`);
      for (const control of body.querySelectorAll(
        ".select-trigger, .activity-search, .funds-search, .segmented-control",
      )) {
        const bounds = control.getBoundingClientRect(),
          page = main().getBoundingClientRect();
        assert(
          bounds.left >= page.left - 1 && bounds.right <= page.right + 1,
          tab + " control escapes the document",
        );
      }
      const empty = new URLSearchParams(location.search).has("empty");
      const sequences = {
        financials: [
          ".financial-heading",
          ".financial-trend",
          ".stock-table-toolbar",
          empty ? ".stock-no-data" : ".financial-table-panel",
        ],
        funds: [
          ".funds-heading",
          ".funds-toolbar",
          ...(!empty ? [".fund-ownership-visual"] : []),
          ".funds-data-heading",
          ".funds-table-toolbar",
          ".table-panel",
        ],
        politicians: [
          ".activity-heading",
          ...(!empty ? [".politician-leaders"] : []),
          ".activity-toolbar",
          ".activity-chart",
          ".activity-data-heading",
          ".activity-table",
        ],
        insiders: [
          ".activity-heading",
          ".activity-toolbar",
          ".activity-chart",
          ".activity-data-heading",
          ".activity-table",
        ],
        analyst: body.querySelector(".analysts-page")
          ? [
              ".activity-heading",
              ".analyst-overview",
              ".activity-data-heading",
              ".activity-toolbar",
              ".analyst-events",
            ]
          : [
              "h2",
              ".stock-analyst-summary",
              ...(!empty ? [".stock-recommendations"] : []),
              ".table-panel",
            ],
      };
      const ordered = sequences[tab]?.map((selector) => {
        const el = body.querySelector(selector);
        assert(!!el, tab + " section missing: " + selector);
        return el.getBoundingClientRect();
      });
      if (ordered)
        assert(
          ordered.every(
            (rect, i) => i === 0 || rect.top >= ordered[i - 1].bottom - 1,
          ),
          tab + " section order/spacing differs",
        );
      if (
        tab === "analyst" &&
        !empty &&
        body.querySelector(".stock-recommendations")
      ) {
        const ratings = [
          ...body.querySelectorAll(".stock-recommendations > div"),
        ];
        assert(
          ratings.length === 5 &&
            ratings.every(
              (el) =>
                Math.abs(
                  el.getBoundingClientRect().top -
                    ratings[0].getBoundingClientRect().top,
                ) < 1,
            ),
          "Analyst spectrum wraps into unrelated rows",
        );
      }
      if (
        tab === "funds" &&
        !empty &&
        body.querySelector(".funds-page").clientWidth <= 440
      ) {
        const holder = body
            .querySelector(".fund-ring-holder")
            .getBoundingClientRect(),
          ring = body.querySelector(".fund-ring-wrap").getBoundingClientRect();
        assert(
          ring.top >= holder.bottom,
          "Narrow selected holder overlaps the ring",
        );
      }
    }
    return {
      allTabsFit: true,
      selectedTabVisible: true,
      tableScrollContained: true,
      sectionOrder: true,
      controlsContained: true,
      populated: !new URLSearchParams(location.search).has("empty"),
    };
  }
}

const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:950,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message)});
 const run=(phase,width)=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(phase)+','+width+')');
 const resize=async(width)=>{win.setContentSize(width,950);await new Promise(r=>setTimeout(r,90));};
 try{
  await win.loadFile(path.join(__dirname,'index.html'));const report=[await run('setup',1440)];
  for(const width of [1440,1279,1100,900,760,1440]){await resize(width);report.push(await run('layout',width));fs.writeFileSync(path.join(__dirname,'desktop-'+width+'.png'),(await win.webContents.capturePage()).toPNG());}
  await resize(1100);report.push(await run('drawer',1100));report.push(await run('openDrawer',1100));
  await resize(1440);report.push(await run('closeWideDrawer',1440));report.push(await run('layout',1440));report.push(await run('preference',1440));
  await resize(760);await resize(1440);report.push(await run('restorePreference',1440));
  await resize(900);report.push(await run('select',900));
  await win.loadFile(path.join(__dirname,'index.html'),{query:{host:'web'}});
  for(const width of [600,390]){await win.webContents.executeJavaScript("location.hash='/stocks/AAPL?tab=chart'");await resize(width);report.push(await run('layout',width));report.push(await run('tabs',width));for(const tab of ['chart','financials','funds','politicians','insiders','analyst']){await win.webContents.executeJavaScript("document.querySelector('#stock-tab-"+tab+"').click();document.querySelector('.stock-main').scrollTop=0");await new Promise(r=>setTimeout(r,60));fs.writeFileSync(path.join(__dirname,'tab-'+width+'-'+tab+'.png'),(await win.webContents.capturePage()).toPNG());}fs.writeFileSync(path.join(__dirname,'web-'+width+'.png'),(await win.webContents.capturePage()).toPNG());}
  await win.loadFile(path.join(__dirname,'index.html'),{query:{host:'web',empty:'1'}});
  await resize(390);report.push(await run('tabs',390));
  fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0);
 }catch(error){console.error(error);console.error(await win.webContents.executeJavaScript('document.body.innerText.slice(0,1800)'));fs.writeFileSync(path.join(__dirname,'failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1)}
});setTimeout(()=>{console.error('Stocks responsive check timed out');app.exit(1)},30000);`;

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
  for (const name of [
    "desktop-1440",
    "desktop-1279",
    "desktop-1100",
    "desktop-900",
    "desktop-760",
    "web-600",
    "web-390",
  ])
    await copyFile(join(output, name + ".png"), join(reports, name + ".png"));
  for (const width of [600, 390])
    for (const tab of [
      "chart",
      "financials",
      "funds",
      "politicians",
      "insiders",
      "analyst",
    ])
      await copyFile(
        join(output, `tab-${width}-${tab}.png`),
        join(reports, `tab-${width}-${tab}.png`),
      );
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
