import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/selects");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/selects.tsx"],
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
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      await wait(20);
    }
    throw Error("Select check timed out: " + check.toString());
  };
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const trigger = (label) =>
    document.querySelector(`button[aria-label="${label}"]`);
  const list = () => document.querySelector('[role="listbox"]');
  const options = () => [...document.querySelectorAll('[role="option"]')];
  const key = async (value) => {
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    );
    await wait(30);
  };
  const open = async (label) => {
    trigger(label).click();
    await until(() => list());
    await wait(60);
  };
  const active = () =>
    document.getElementById(
      document.activeElement.getAttribute("aria-activedescendant"),
    );
  const search = async (value) => {
    const input = document.querySelector(".select-search input");
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(40);
  };
  const bounded = () => {
    const box = document
      .querySelector(".select-popover")
      .getBoundingClientRect();
    assert(
      box.left >= 11 &&
        box.right <= innerWidth - 11 &&
        box.top >= 11 &&
        box.bottom <= innerHeight - 11,
      "Popup is outside viewport",
    );
  };
  await until(() => trigger("Period"));
  if (phase === "core") {
    await open("Period");
    assert(document.activeElement === list(), "Listbox not focused");
    assert(
      options()[0].getAttribute("aria-selected") === "true" &&
        options()[0].querySelector("svg"),
      "Selected option has no check",
    );
    const chevron = trigger("Period")
        .querySelector("svg")
        .getBoundingClientRect(),
      value = trigger("Period").querySelector("span").getBoundingClientRect();
    assert(chevron.left - value.right <= 9, "Chevron is too far from label");
    await key("ArrowDown");
    assert(
      active().textContent === "Last 7 days",
      "Keyboard selected disabled choice",
    );
    await key("Enter");
    await until(() => !list());
    assert(
      document.querySelector("#selection").textContent === "7|model-3|1" &&
        document.activeElement === trigger("Period"),
      "Selection/focus restoration failed",
    );
    await open("Period");
    await key("End");
    assert(active().textContent === "Last year", "End navigation failed");
    await key("Home");
    assert(active().textContent === "All time", "Home navigation failed");
    await key("l");
    assert(active().textContent === "Last 7 days", "Typeahead failed");
    await key("Escape");
    await until(() => !list());
    assert(
      document.querySelector("#selection").textContent === "7|model-3|1",
      "Escape committed a choice",
    );
    await open("Period");
    options()
      .find((o) => o.getAttribute("aria-disabled") === "true")
      .click();
    await wait(30);
    assert(!!list(), "Disabled choice closed picker");
    document
      .querySelector("#after-period")
      .dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "mouse",
          button: 0,
        }),
      );
    document.querySelector("#after-period").click();
    await until(() => !list());
    await open("Model");
    assert(
      document.activeElement.matches('input[role="combobox"]'),
      "Search not focused",
    );
    assert(
      document.querySelector(".select-options").scrollHeight >
        document.querySelector(".select-options").clientHeight,
      "Long list is not scrollable",
    );
    bounded();
    await search("special");
    assert(
      options().length === 1 && options()[0].textContent === "Model 17",
      "Search keywords failed",
    );
    await key("Enter");
    await until(() => !list());
    assert(
      document.querySelector("#selection").textContent === "7|model-17|1",
      "Search choice not committed",
    );
    await open("Model");
    await search("does-not-exist");
    assert(
      !options().length &&
        document.querySelector('[role="status"]').textContent === "No results",
      "No-match state missing",
    );
    await key("Enter");
    assert(!!list(), "Enter with no match closed picker");
    await key("Escape");
    await until(() => !list());
    await open("Model");
    assert(
      options().length === 80 && active().textContent === "Model 17",
      "Reopen retained filter/lost selection",
    );
    await key("Escape");
    await until(() => !list());
    trigger("Empty choices").click();
    await wait(30);
    assert(!list(), "Disabled trigger opened");
    document.querySelector("#disable-period").click();
    await wait(30);
    assert(trigger("Period").disabled, "Async disabled state lost");
    document.querySelector("#disable-period").click();
    await wait(30);
    document.querySelector("#open-dialog").click();
    await until(() => trigger("Dialog period"));
    await open("Dialog period");
    bounded();
    await key("Escape");
    await until(() => !list());
    assert(
      document.querySelector('[role="dialog"]') &&
        document.activeElement === trigger("Dialog period"),
      "Escape closed parent dialog/lost focus: " +
        JSON.stringify({
          dialog: !!document.querySelector('[role="dialog"]'),
          focus: document.activeElement.outerHTML.slice(0, 250),
        }),
    );
    await key("Escape");
    await until(() => !document.querySelector('[role="dialog"]'));
    await open("Period");
    return {
      keyboard: true,
      search: true,
      disabled: true,
      noMatch: true,
      portalInDialog: true,
      focusReturn: true,
    };
  }
  if (phase === "tab") {
    assert(
      !list() && document.activeElement.id === "after-period",
      "Tab did not dismiss and advance focus",
    );
    await open("Period");
    return { tabAdvances: true };
  }
  if (phase === "shift-tab") {
    assert(
      !list() && document.activeElement.id === "before-period",
      "Shift+Tab did not return to previous focusable control",
    );
    return { shiftTab: true };
  }
  document.documentElement.dataset.theme = phase === "dark" ? "dark" : "light";
  await open("Model");
  await search("model");
  bounded();
  assert(
    document.documentElement.scrollWidth <= innerWidth,
    "Picker caused horizontal page overflow",
  );
  return {
    viewport: innerWidth,
    theme: document.documentElement.dataset.theme,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1000,height:700,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const run=(phase)=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(phase)+')');const report=[];report.push(await run('core'));win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});await new Promise(r=>setTimeout(r,100));report.push(await run('tab'));win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['shift']});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['shift']});await new Promise(r=>setTimeout(r,100));report.push(await run('shift-tab'));for(const [width,phase] of [[1000,'light'],[390,'light'],[390,'dark']]){win.setContentSize(width,700);await new Promise(r=>setTimeout(r,100));report.push(await run(phase));fs.writeFileSync(path.join(__dirname,phase+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await new Promise(r=>setTimeout(r,50));}fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('Select UI check timed out');app.exit(1)},25000);`;
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
  for (const name of ["light-1000.png", "light-390.png", "dark-390.png"])
    await copyFile(join(output, name), join(reports, name));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
