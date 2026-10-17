import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/workspace-navigation");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/workspace-navigation.tsx"],
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
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error("Navigation check timed out: " + check.toString());
  };
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const key = (value, target = window, modifiers = { metaKey: true }) =>
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
        ...modifiers,
      }),
    );
  const dialog = () => document.querySelector(".workspace-search-dialog");
  const input = () =>
    document.querySelector('[aria-label="Search workspace content"]');
  await until(
    () =>
      !!document.querySelector(".settings-content") &&
      document.querySelector('[aria-label="Go back"]').disabled,
  );
  key("[");
  await wait(50);
  assert(
    location.hash === "#/settings/general",
    "Back escaped the initial session entry",
  );
  location.hash = "/agents";
  await until(
    () => document.querySelector('[aria-label="Go back"]').disabled === false,
  );
  key("[");
  await until(() => location.hash === "#/settings/general");
  key("]");
  await until(() => location.hash === "#/agents");
  key("[");
  await until(() => location.hash === "#/settings/general");
  location.hash = "/library";
  await until(
    () =>
      document.querySelector(".page-label")?.textContent === "Library" ||
      document.querySelector(".window-title")?.textContent.includes("Library"),
  );
  key("]");
  await wait(50);
  assert(location.hash === "#/library", "Forward history was not truncated");
  key("b");
  await until(() =>
    document
      .querySelector(".app-shell")
      .classList.contains("sidebar-collapsed"),
  );
  key("b");
  await until(
    () =>
      !document
        .querySelector(".app-shell")
        .classList.contains("sidebar-collapsed"),
  );
  const textInput = document.querySelector("input");
  textInput.focus();
  assert(key("b", textInput), "Sidebar shortcut intercepted editing");
  assert(
    !document
      .querySelector(".app-shell")
      .classList.contains("sidebar-collapsed"),
    "Sidebar collapsed while editing",
  );
  key("k");
  await until(
    () =>
      dialog() &&
      [...document.querySelectorAll(".search-results button")].filter(
        (button) => button.querySelector("small")?.textContent === "Stock",
      ).length >= 12,
  );
  assert(
    dialog().querySelector("h2").textContent === "Search" &&
      !dialog().textContent.includes("Navigate ·") &&
      !dialog().textContent.includes("↵ Open"),
    "Search chrome contains redundant copy",
  );
  const box = dialog().getBoundingClientRect();
  const results = document.querySelector(".search-results");
  const searchField = document
    .querySelector(".workspace-search-dialog .search-field")
    .getBoundingClientRect();
  assert(
    box.height <= 560 && box.top >= 0 && box.bottom <= innerHeight,
    "Search dialog exceeded height limit",
  );
  assert(searchField.height === 40, "Search field height differs");
  assert(
    results.scrollHeight > results.clientHeight,
    "Results do not scroll internally",
  );
  const firstLabel = [...results.querySelectorAll("button")]
    .find((button) => button.querySelector("small")?.textContent === "Stock")
    .querySelector("span");
  assert(
    getComputedStyle(firstLabel).whiteSpace === "nowrap" &&
      firstLabel.scrollWidth > firstLabel.clientWidth,
    "Long result names are not truncated",
  );
  key("ArrowUp", input(), {});
  const last = results.querySelector("button:last-of-type");
  assert(
    document.activeElement === last && results.scrollTop > 0,
    "Arrow navigation failed to reveal the last result",
  );
  key("ArrowDown", last, {});
  const first = results.querySelector("button");
  assert(document.activeElement === first, "Arrow navigation did not wrap");
  key("Escape", first, {});
  await until(() => !dialog());
  key("k");
  await until(() => !!input());
  key("Enter", input(), {});
  await until(() => location.hash.startsWith("#/stocks/TEST0") && !dialog());
  assert(
    !document.querySelector(".stock-sidebar-heading .count-badge"),
    "Stock collection count is still visible",
  );
  const collectionName = document.querySelector(
    ".stock-sidebar-heading .select-value",
  );
  assert(
    collectionName.scrollWidth <= collectionName.clientWidth,
    "Collection title is unnecessarily truncated",
  );
  key("k");
  await until(() => !!input());
  key("/", input());
  await until(() => !!document.querySelector(".shortcut-list") && !dialog());
  assert(
    document.querySelector(".shortcut-list").textContent.includes("New chat"),
    "Desktop shortcut help is incomplete",
  );
  key("Escape", document.activeElement, {});
  await until(() => !document.querySelector('[role="dialog"]'));
  key("n");
  await until(
    () =>
      location.hash === "#/research" &&
      document.querySelector('[aria-label="Research question"]') ===
        document.activeElement,
  );
  const chatIcon = document.querySelector(".window-title .page-icon-chat");
  assert(
    chatIcon &&
      getComputedStyle(chatIcon).padding === "1px" &&
      chatIcon.getBoundingClientRect().width === 18,
    "Chat breadcrumb icon is not optically normalized",
  );
  assert(
    !key("n", window, { metaKey: true, repeat: true }),
    "Held shortcut should not repeat",
  );
  key(",");
  await until(() => !!document.querySelector(".settings-content"));
  return {
    boundedHistory: true,
    branchHistory: true,
    sidebarToggle: true,
    editingPreserved: true,
    boundedSearch: true,
    internalResultsScroll: true,
    truncatedNames: true,
    searchKeyboard: true,
    shortcutHelp: true,
    newChatFocus: true,
  };
}
// Force real CSS hover states in the offline Electron renderer, in both themes.
async function hoverChecks(win) {
  const debug = win.webContents.debugger;
  debug.attach("1.3");
  await debug.sendCommand("DOM.enable");
  await debug.sendCommand("CSS.enable");
  const { root } = await debug.sendCommand("DOM.getDocument");
  const original = await win.webContents.executeJavaScript(
    "document.documentElement.dataset.theme",
  );
  const selectors = [
    ".rail-button",
    ".search-trigger",
    ".settings-search",
    ".settings-nav-link",
    ".icon-button:not(:disabled)",
  ];
  try {
    for (const theme of ["light", "dark"]) {
      await win.webContents.executeJavaScript(
        `document.documentElement.dataset.theme=${JSON.stringify(theme)}`,
      );
      let reference;
      for (const selector of selectors) {
        const { nodeId } = await debug.sendCommand("DOM.querySelector", {
          nodeId: root.nodeId,
          selector,
        });
        if (!nodeId) throw Error("Missing hover control: " + selector);
        await debug.sendCommand("CSS.forcePseudoState", {
          nodeId,
          forcedPseudoClasses: ["hover"],
        });
        await new Promise((resolve) => setTimeout(resolve, 180));
        const color = await win.webContents.executeJavaScript(
          `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).backgroundColor`,
        );
        if (reference && color !== reference)
          throw Error(
            `${theme} hover differs for ${selector}: ${color} vs ${reference}`,
          );
        reference = color;
        await debug.sendCommand("CSS.forcePseudoState", {
          nodeId,
          forcedPseudoClasses: [],
        });
      }
    }
  } finally {
    await win.webContents.executeJavaScript(
      `document.documentElement.dataset.theme=${JSON.stringify(original)}`,
    );
    debug.detach();
  }
  return true;
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');report.sharedHover=await (${hoverChecks.toString()})(win);fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));await win.webContents.executeJavaScript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true}))");await new Promise(r=>setTimeout(r,200));fs.writeFileSync(path.join(__dirname,'search.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Workspace navigation check timed out');app.exit(1)},25000);`;
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
  await copyFile(join(output, "search.png"), join(reports, "search.png"));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
