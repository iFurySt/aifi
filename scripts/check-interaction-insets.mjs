import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/interaction-insets");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/text-selection.tsx"],
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
async function checks(phase = "audit") {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error("Inset audit timed out at " + location.hash + ": " + check);
  };
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const visible = (e) =>
    e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const selectors = new Set();
  const visit = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) visit(rule.cssRules);
      if (
        !rule.selectorText ||
        !rule.style?.background ||
        !/:hover|:focus-visible|:focus-within|\[data-highlighted\]/.test(
          rule.selectorText,
        )
      )
        continue;
      for (const s of rule.selectorText.split(","))
        selectors.add(
          s
            .replace(
              /:hover|:focus-visible|:focus-within|\[data-highlighted\]/g,
              "",
            )
            .trim(),
        );
    }
  };
  for (const sheet of document.styleSheets) visit(sheet.cssRules);
  const audit = (route) => {
    const seen = new Set(),
      failures = [],
      classes = new Set();
    for (const selector of selectors) {
      let items;
      try {
        items = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const el of items) {
        if (seen.has(el) || !visible(el) || el.closest("svg")) continue;
        seen.add(el);
        classes.add(el.className);
        const style = getComputedStyle(el),
          box = el.getBoundingClientRect();
        if (
          parseFloat(style.paddingInlineStart) > 0 &&
          parseFloat(style.paddingInlineEnd) > 0
        )
          continue;
        // Centered icon/rail targets can have space supplied by their fixed box.
        const atoms = [
          ...el.querySelectorAll(
            "svg,img,.profile-avatar,.company-monogram,.stock-avatar",
          ),
        ]
          .filter((e) => !e.closest("svg") || e.tagName.toLowerCase() === "svg")
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width && r.height);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim() || node.parentElement.closest("svg"))
            continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects())
            if (r.width && r.height) atoms.push(r);
        }
        if (!atoms.length) continue;
        const left = Math.min(...atoms.map((r) => r.left)) - box.left,
          right = box.right - Math.max(...atoms.map((r) => r.right));
        if (left < 1.5 || right < 1.5)
          failures.push({
            selector,
            item: el.className,
            text: el.textContent.trim().slice(0, 65),
            left,
            right,
          });
      }
    }
    return { route, count: seen.size, classes: [...classes], failures };
  };
  if (phase === "peer") {
    location.hash = "/stocks/AAPL?tab=chart";
    await until(
      () => document.querySelectorAll(".stock-peer-row").length === 2,
    );
    const row = document.querySelector(".stock-peer-row");
    const list = row.parentElement,
      column = row.closest(".stock-metrics-column");
    const heading = document.querySelector(".stock-peers h2");
    const box = row.getBoundingClientRect(),
      first = row.firstElementChild.getBoundingClientRect(),
      price = row.lastElementChild.getBoundingClientRect();
    assert(
      first.left - box.left >= 8 && box.right - price.right >= 8,
      "Peer content touches its hover edges",
    );
    assert(
      Math.abs(first.left - heading.getBoundingClientRect().left) < 1,
      "Peer content shifted from the heading",
    );
    if (column) {
      const outer = column.getBoundingClientRect();
      assert(
        box.left >= outer.left && box.right <= outer.right,
        "Expanded hover escapes its column",
      );
    }
    assert(
      document.documentElement.scrollWidth <= innerWidth,
      "Horizontal window overflow",
    );
    row.scrollIntoView({ block: "center" });
    row.focus();
    const focused = row.getBoundingClientRect();
    assert(
      Math.abs(box.width - focused.width) < 1,
      "Focus moved peer geometry",
    );
    assert(
      getComputedStyle(row).backgroundColor !== "rgba(0, 0, 0, 0)",
      "Peer keyboard focus is invisible",
    );
    row.blur();
    return {
      width: innerWidth,
      theme: document.documentElement.dataset.theme,
      paddedPeers: true,
      aligned: true,
      stableFocus: true,
      report: audit("peer"),
    };
  }
  await until(() => document.querySelector(".stock-quote"));
  const reports = [];
  for (const tab of [
    "chart",
    "financials",
    "funds",
    "politicians",
    "insiders",
    "analyst",
  ]) {
    location.hash = "/stocks/AAPL?tab=" + tab;
    await until(() => document.querySelector("#stock-panel-" + tab));
    reports.push(audit("stocks/" + tab));
  }
  const routes = [
    ["/research", ".research-page"],
    ["/agents", ".agent-grid"],
    ["/watchlist", ".watchlist-table"],
    ["/arena", ".arena-workspace,.arena-empty"],
    ["/portfolio", ".portfolio-stats"],
    ["/library", ".library-grid"],
    ["/usage", ".usage-page"],
  ];
  for (const [route, selector] of routes) {
    if (!window.selectionPages.includes(route.slice(1))) continue;
    location.hash = route;
    await until(() => document.querySelector(selector));
    reports.push(audit(route));
  }
  for (const section of [
    "appearance",
    "chatgpt",
    "sources",
    "keys",
    "sync",
    "storage",
  ]) {
    location.hash = "/settings/" + section;
    await until(
      () =>
        document
          .querySelector('.settings-nav-link[aria-current="page"]')
          ?.getAttribute("href") ===
        "#/settings/" + section,
    );
    reports.push(audit("settings/" + section));
  }
  location.hash = "/stocks/AAPL?tab=chart";
  await until(() => document.querySelector(".stock-quote"));
  document.querySelector('[aria-label="Stock collection"]').click();
  await until(() => document.querySelector('[role="listbox"]'));
  reports.push(audit("select-popup"));
  document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await until(() => !document.querySelector('[role="listbox"]'));
  document.querySelector(".search-trigger").click();
  await until(() => document.querySelector(".workspace-search-dialog"));
  reports.push(audit("workspace-search"));
  document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await until(() => !document.querySelector('[role="dialog"]'));
  document
    .querySelector(".profile-trigger")
    .dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        ctrlKey: false,
      }),
    );
  await until(() => document.querySelector(".workspace-menu"));
  reports.push(audit("account-menu"));
  document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await until(() => !document.querySelector(".workspace-menu"));
  const failures = reports.flatMap((r) =>
    r.failures.map((f) => ({ route: r.route, ...f })),
  );
  assert(failures.length === 0, JSON.stringify(failures));
  return reports;
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:true,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});try{await win.loadFile(path.join(__dirname,'index.html'),{query:{hover:'1'}});const run=p=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(p)+')');win.focus();const report={routes:await run('audit'),layouts:[]};for(const [width,theme] of [[1440,'light'],[1000,'dark'],[650,'light'],[390,'dark']]){win.setContentSize(width,1000);await win.webContents.executeJavaScript('document.documentElement.dataset.theme='+JSON.stringify(theme));await new Promise(r=>setTimeout(r,80));win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});report.layouts.push(await run('peer'));if(!win.webContents.debugger.isAttached()){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('DOM.enable');await win.webContents.debugger.sendCommand('CSS.enable');}const dom=await win.webContents.debugger.sendCommand('DOM.getDocument');const {nodeId}=await win.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'.stock-peer-row'});await win.webContents.debugger.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});await new Promise(r=>setTimeout(r,180));if(!(await win.webContents.executeJavaScript("getComputedStyle(document.querySelector('.stock-peer-row')).backgroundColor !== 'rgba(0, 0, 0, 0)'")))throw Error('Peer hover is invisible');fs.writeFileSync(path.join(__dirname,theme+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG());}fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({routes:report.routes.map(r=>({route:r.route,count:r.count,failures:r.failures})),layouts:report.layouts.map(({report,...r})=>r)}));app.exit(0)}catch(e){console.error(e);fs.writeFileSync(path.join(__dirname,'failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1)}});setTimeout(()=>app.exit(1),30000);`;
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
