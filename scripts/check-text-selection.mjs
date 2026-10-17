import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/text-selection");
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
async function checks() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error("Selection check timed out: " + check.toString());
  };
  const assert = (ok, msg) => {
    if (!ok) throw Error(msg);
  };
  const selection = (element) => getComputedStyle(element).userSelect;
  const main = () => document.getElementById("main-content");
  const report = [];
  const check = (route) => {
    assert(
      selection(document.body) === "none",
      "Default chrome selection is enabled: " + route,
    );
    assert(
      selection(main()) === "text",
      "Main document selection disabled: " + route,
    );
    for (const el of document.querySelectorAll(
      '.window-toolbar,.topbar,.tool-rail,.sidebar,button,[role="tab"],header,.page-heading,.data-toolbar,.stock-table-toolbar',
    )) {
      assert(
        selection(el) === "none",
        "Selectable UI chrome: " + route + " " + el.className,
      );
    }
    for (const input of document.querySelectorAll(
      'input:not([type="checkbox"]),textarea',
    )) {
      if (!input.disabled) {
        input.focus();
        assert(
          selection(input) === "text",
          "Input selection disabled: " +
            route +
            " " +
            input.outerHTML.slice(0, 200) +
            " focused=" +
            (document.activeElement === input) +
            " style=" +
            selection(input) +
            " pseudo=" +
            input.matches(":focus") +
            " doc=" +
            document.hasFocus(),
        );
      }
      if (!input.disabled && input.type !== "number") {
        const value = input.value;
        input.value = "Editable selection";
        input.setSelectionRange(0, 8);
        assert(
          input.selectionStart === 0 && input.selectionEnd === 8,
          "Input text range failed: " + route,
        );
        input.value = value;
      }
      input.blur();
      assert(
        selection(input) === "none",
        "Unfocused field joins document selection: " + route,
      );
    }
    main().focus();
    document.execCommand("selectAll");
    const copied = window.getSelection().toString();
    assert(
      !copied.includes("AIFi /") &&
        !copied.includes("Latest stored close") &&
        !copied.includes("Find a stock…"),
      "Select All includes chrome: " + route,
    );
    window.getSelection().removeAllRanges();
    report.push({
      route,
      chromeUnselectable: true,
      documentSelectable: true,
      editableFieldsPreserved: true,
    });
  };
  await until(() => main() && document.querySelector(".stock-quote"));
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
    check("stocks/" + tab);
  }
  const routes = [
    ["/research", ".research-page"],
    ["/agents", ".agent-grid"],
    ["/watchlist", ".watchlist-table"],
    ["/portfolio", ".portfolio-stats"],
    ["/library", ".library-grid"],
    ["/usage", ".usage-page"],
  ];
  for (const [route, selector] of routes) {
    if (!window.selectionPages.includes(route.slice(1))) continue;
    location.hash = route;
    await until(() => document.querySelector(selector));
    check(route);
  }
  for (const section of [
    "general",
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
        document.querySelector(".settings-content") &&
        document
          .querySelector('.settings-nav-link[aria-current="page"]')
          ?.getAttribute("href") ===
          "#/settings/" + section,
    );
    check("settings/" + section);
  }
  location.hash = "/agents";
  await until(() => document.querySelector(".agent-card-body"));
  document.querySelector(".agent-card-body").click();
  await until(() => document.querySelector(".detail-prompt"));
  assert(
    selection(document.querySelector(".detail-prompt")) === "text",
    "Agent instructions are not selectable",
  );
  assert(
    selection(document.querySelector(".dialog-header")) === "none",
    "Dialog header is selectable",
  );
  document.querySelector('[aria-label="Close dialog"]').click();
  await until(() => !document.querySelector('[role="dialog"]'));
  location.hash = "/library";
  await until(() => document.querySelector(".library-card"));
  document.querySelector(".library-card").click();
  await until(() => document.querySelector(".workflow-steps"));
  assert(
    selection(document.querySelector(".workflow-steps")) === "text",
    "Workflow reading content is not selectable",
  );
  document.querySelector('[aria-label="Close dialog"]').click();
  await until(() => !document.querySelector('[role="dialog"]'));
  location.hash = "/settings/appearance";
  await until(() => document.querySelector('button[aria-label="Color theme"]'));
  document.querySelector('button[aria-label="Color theme"]').click();
  await until(() => document.querySelector('[role="listbox"]'));
  assert(
    selection(document.querySelector('[role="listbox"]')) === "none" &&
      [...document.querySelectorAll('[role="option"]')].every(
        (o) => selection(o) === "none",
      ),
    "Select popup text is selectable",
  );
  document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await until(() => !document.querySelector('[role="listbox"]'));
  location.hash = "/stocks/AAPL?tab=chart";
  await until(() => document.querySelector(".stock-quote"));
  const paragraph = document.querySelector(".stock-company-about p");
  assert(
    selection(paragraph) === "text",
    "Company description cannot be copied",
  );
  main().focus();
  document.execCommand("selectAll");
  assert(
    window.getSelection().toString().includes("Synthetic company information"),
    "Select All lost the company description",
  );
  assert(
    !window.getSelection().toString().includes("Watching"),
    "Select All includes the watch control",
  );
  return {
    pages: report,
    readableDialogs: true,
    popupControlsUnselectable: true,
    selectAllKeepsBody: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:true,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));win.focus();const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'selection.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Text selection check timed out');app.exit(1)},25000);`;
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
  await copyFile(join(output, "selection.png"), join(reports, "selection.png"));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
