import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/storage-ui");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/storage-ui.tsx"],
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
  loader: { ".png": "file", ".svg": "file", ".woff2": "file" },
  logLevel: "warning",
});
await writeFile(
  join(output, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="renderer.css"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>',
);
await writeFile(
  join(output, "preload.cjs"),
  `const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('storageBridge',{getRuntimeInfo:()=>ipcRenderer.invoke('runtime'),requestData:(method,params)=>ipcRenderer.invoke('data',method,params)});`,
);
async function checks() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check) => {
    for (let i = 0; i < 200; i++) {
      if (check()) return;
      await wait(25);
    }
    throw Error("Storage UI timed out: " + check.toString());
  };
  const assert = (value, message) => {
    if (!value) throw Error(message);
  };
  const rows = () => [...document.querySelectorAll(".storage-file-row")];
  const refresh = () =>
    document.querySelector(".storage-section-heading button");
  await until(() => rows().length === 50);
  assert(
    rows()[0].textContent.includes("largest.bin"),
    "Files are not sorted by size",
  );
  assert(
    document.querySelectorAll(".storage-legend").length === 2,
    "Missing disk/SQLite breakdown",
  );
  assert(
    document.querySelector(".storage-total").textContent.includes("MB"),
    "Missing real total",
  );
  const folder = rows().find(
    (row) => row.querySelector("strong")?.textContent === "stock-logos/v2",
  );
  assert(
    folder &&
      folder.textContent.includes("80 files") &&
      folder.querySelector(".storage-number").textContent.includes("160"),
    "Logo cache directory is missing totals",
  );
  assert(
    !rows().some((row) => row.textContent.includes("logo-")),
    "Individual cache images leaked into the list",
  );
  folder.querySelector(".storage-reveal").click();
  await wait(60);
  document.querySelector(".storage-reveal").click();
  await wait(60);
  document.querySelector(".storage-folder button").click();
  await wait(60);
  const total = document.querySelector(".storage-total").textContent;
  const reads = window.storageFixture.reads;
  document.querySelector(".storage-load-more").click();
  await until(
    () => rows().length > 50 && !document.querySelector(".storage-load-more"),
  );
  assert(window.storageFixture.reads === reads, "Pagination rescanned files");
  window.storageFixture.fail = true;
  refresh().click();
  assert(rows().length > 50, "Refresh cleared existing files");
  await until(() =>
    document
      .querySelector(".settings-service-error")
      ?.textContent.includes("Couldn't refresh"),
  );
  assert(
    document.querySelector(".storage-total").textContent === total,
    "Failure removed totals",
  );
  window.storageFixture.fail = false;
  refresh().click();
  await until(
    () =>
      !document.querySelector(".settings-service-error") &&
      rows().length === 50,
  );
  assert(
    !document
      .querySelector(".storage-settings")
      .textContent.includes("synthetic-private-value"),
    "Secret content leaked",
  );
  assert(
    document.documentElement.scrollWidth === innerWidth,
    "Desktop overflow",
  );
  return {
    realGoAccounting: true,
    descendingFiles: true,
    paginationWithoutRescan: true,
    refreshRetainsContent: true,
    refreshErrorRecovery: true,
    nativeRevealDispatch: true,
    collapsedLogoDirectory: true,
  };
}
const main = `import {app,BrowserWindow,ipcMain} from 'electron';
import {DataHost} from '${join(root, "packages/host/src/runtime.ts")}';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
app.setPath('userData',join(${JSON.stringify(output)},'profile'));
let host;const revealed=[];
app.whenReady().then(async()=>{
const dataDir=join(${JSON.stringify(output)},'data');mkdirSync(dataDir,{recursive:true});
writeFileSync(join(dataDir,'largest.bin'),Buffer.alloc(2*1024*1024));
writeFileSync(join(dataDir,'aifi-vault.key'),'synthetic-private-value');
mkdirSync(join(dataDir,'stock-logos'),{recursive:true});
for(let i=0;i<55;i++)writeFileSync(join(dataDir,'sample-'+i+'.json'),Buffer.alloc(300+i));
mkdirSync(join(dataDir,'stock-logos','v2','nested'),{recursive:true});for(let i=0;i<80;i++)writeFileSync(join(dataDir,'stock-logos','v2','nested','logo-'+i+'.png'),Buffer.alloc(2048));
host=new DataHost(${JSON.stringify(join(root, "apps/desktop/dist/aifi"))},dataDir,true,(path,directory)=>{revealed.push({path,directory})});
ipcMain.handle('runtime',()=>({kind:'desktop',version:'test',platform:'darwin'}));ipcMain.handle('data',(_e,m,p)=>host.request(m,p));
const win=new BrowserWindow({show:false,width:1360,height:1100,webPreferences:{preload:join(${JSON.stringify(output)},'preload.cjs'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
try{await win.loadFile(join(${JSON.stringify(output)},'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');
if(revealed.length!==3||!revealed[0].path.endsWith('stock-logos/v2')||!revealed[0].directory||!revealed[1].path.endsWith('largest.bin')||revealed[1].directory||!revealed[2].directory)throw Error('Native reveal paths incorrect');
writeFileSync(join(${JSON.stringify(output)},'storage-desktop.png'),(await win.webContents.capturePage()).toPNG());
await win.webContents.executeJavaScript("document.querySelector('.storage-files').scrollIntoView();");writeFileSync(join(${JSON.stringify(output)},'storage-files.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript("document.getElementById('main-content').scrollTop=0;document.documentElement.dataset.theme='dark'");writeFileSync(join(${JSON.stringify(output)},'storage-dark.png'),(await win.webContents.capturePage()).toPNG());
win.setSize(390,844);await new Promise(r=>setTimeout(r,150));
const mobile=await win.webContents.executeJavaScript("document.documentElement.scrollWidth===innerWidth && [...document.querySelectorAll('.storage-settings *')].every(e=>e.getBoundingClientRect().right <= innerWidth + 1)");if(!mobile)throw Error('Mobile storage overflow');
writeFileSync(join(${JSON.stringify(output)},'storage-mobile.png'),(await win.webContents.capturePage()).toPNG());
// Re-enter under the web runtime to verify copy-path affordances.
await win.webContents.executeJavaScript("window.storageFixture.web=true;location.hash='/settings/general'");await new Promise(r=>setTimeout(r,100));await win.webContents.executeJavaScript("location.hash='/settings/storage'");await new Promise(r=>setTimeout(r,250));
if(!await win.webContents.executeJavaScript("document.querySelector('.storage-reveal').getAttribute('aria-label').startsWith('Copy path:')"))throw Error('Web path copy missing');
writeFileSync(join(${JSON.stringify(output)},'report.json'),JSON.stringify({...report,mobileNoOverflow:true,darkTheme:true,webPathCopy:true},null,2));console.log(JSON.stringify(report));await host.stop();app.exit(0);
}catch(error){console.error(error);await host?.stop();app.exit(1)}});setTimeout(()=>{host?.stop().finally(()=>app.exit(1))},25000);`;
await writeFile(join(output, "main.ts"), main);
await build({
  entryPoints: [join(output, "main.ts")],
  outfile: join(output, "main.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  logLevel: "warning",
});
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
await rm(join(output, "data"), { recursive: true, force: true });
if (exit === 0) {
  for (const file of [
    "report.json",
    "storage-desktop.png",
    "storage-files.png",
    "storage-dark.png",
    "storage-mobile.png",
  ])
    await copyFile(join(output, file), join(reports, file));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
