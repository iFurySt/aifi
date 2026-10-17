import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/chatgpt");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/chatgpt.tsx"],
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
    throw Error("Chat check timed out: " + check.toString());
  };
  const saved = () =>
    JSON.parse(localStorage.getItem("aifi.workspace.v1"))?.conversations[0]
      ?.messages ?? [];
  const composer = () =>
    document.querySelector('[aria-label="Research question"]');
  const send = () =>
    document.querySelector('[aria-label="Send research question"]');
  const enter = async (text) => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    ).set.call(composer(), text);
    composer().dispatchEvent(new Event("input", { bubbles: true }));
    await until(() => !send().disabled);
    send().click();
  };
  await until(
    () => !!document.querySelector('[aria-label="Chat model"]') && composer(),
  );
  const initialComposer = composer();
  await enter("Test a completed reply.");
  await until(
    () =>
      saved().length === 2 &&
      !document.querySelector('[aria-label="Stop response"]'),
  );
  if (
    saved()[1].source !== "chatgpt" ||
    !document
      .querySelector(".message-assistant")
      .textContent.includes("ChatGPT · Draft")
  )
    throw Error("Completed reply provenance missing");
  if (composer() !== initialComposer)
    throw Error("Sending remounted the composer");
  window.chatFixture.failure = true;
  await enter("Test an interrupted reply.");
  await until(() => !!document.querySelector(".chat-error .button"));
  if (saved().length !== 3 || saved().at(-1).role !== "user")
    throw Error("Failed reply was saved as complete");
  window.chatFixture.failure = false;
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent === "Retry reply")
    .click();
  await until(() => saved().length === 4);
  window.chatFixture.delay = 250;
  await enter("Test cancellation.");
  await until(() => !!document.querySelector('[aria-label="Stop response"]'));
  document.querySelector('[aria-label="Stop response"]').click();
  await wait(650);
  if (saved().length !== 5 || !window.chatFixture.cancelled)
    throw Error("Cancelled reply was saved as complete");
  return {
    completedReplyPersists: true,
    failedReplyIsRetryable: true,
    cancelledReplyStaysProvisional: true,
    composerStable: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1360,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',(event)=>{if(event.level==='error')console.error(event.message)});try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(error){console.error(error);app.exit(1)}});setTimeout(()=>{console.error('ChatGPT UI check timed out');app.exit(1)},25000);`;
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
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
