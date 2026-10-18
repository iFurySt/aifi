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
  const started = performance.now();
  await until(() => rows().length === 50);
  assert(
    performance.now() - started < 1500,
    "File inventory waited for database accounting",
  );
  assert(
    !!document.querySelector(".storage-database .storage-refreshing"),
    "Missing independent database progress",
  );
  assert(
    rows()[0].textContent.includes("largest.bin"),
    "Files are not sorted by size",
  );
  assert(
    document.querySelectorAll(".storage-legend").length === 1,
    "File overview should render before slow database details",
  );
  assert(
    document.querySelector(".storage-total").textContent.includes("MB"),
    "Missing real total",
  );
  const folder = rows().find(
    (row) => row.querySelector("strong")?.textContent === "stock-logos",
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
  const rootFolder = rows().find(
    (row) => row.querySelector("strong")?.textContent === "Data folder",
  );
  assert(
    rootFolder &&
      !rows().some(
        (row) => row.querySelector("strong")?.textContent === "exact.bin",
      ),
    "Files at or below 50 MB were not grouped",
  );
  assert(
    !document.querySelector(".storage-folder"),
    "Standalone data path remains",
  );
  rootFolder.querySelector(".storage-reveal").click();
  await wait(60);
  await until(() => document.querySelectorAll(".storage-legend").length === 2);
  for (const breakdown of document.querySelectorAll(".storage-breakdown")) {
    const segments = [...breakdown.querySelectorAll(".storage-meter > span")];
    const legend = [...breakdown.querySelectorAll(".storage-legend > div")];
    assert(
      segments.length === legend.length,
      "Bar and legend differ in length",
    );
    const widths = segments.map((segment) => parseFloat(segment.style.width));
    assert(
      widths.every((width, i) => !i || widths[i - 1] >= width),
      "Storage bar is not largest first",
    );
    segments.forEach((segment, i) => {
      const name = legend[i].querySelector("dt").textContent.trim();
      const size = legend[i].querySelector("dd").textContent;
      assert(
        segment.title === `${name}: ${size}`,
        "Bar and legend order differs",
      );
      assert(
        getComputedStyle(segment).backgroundColor ===
          getComputedStyle(legend[i].querySelector("i")).backgroundColor,
        "Bar and legend category colors differ",
      );
    });
  }
  const refreshBounds = refresh().getBoundingClientRect();
  assert(
    refreshBounds.width <= 32 &&
      refreshBounds.height <= 32 &&
      !refresh().textContent.trim() &&
      refresh().getAttribute("aria-label"),
    "Storage refresh is not a compact labeled icon",
  );
  window.storageFixture.databaseMode = "normal";
  const reads = window.storageFixture.reads;
  document.querySelector(".storage-load-more").click();
  await until(
    () => rows().length > 50 && !document.querySelector(".storage-load-more"),
  );
  assert(window.storageFixture.reads === reads, "Pagination rescanned files");
  const expanded = rows().length;
  window.storageFixture.delay = 600;
  location.hash = "/settings/general";
  await until(() => !document.querySelector(".storage-settings"));
  const frames = [];
  let watching = true;
  const observe = () => {
    if (!watching) return;
    if (document.querySelector(".storage-settings"))
      frames.push({
        count: rows().length,
        loading: !!document.querySelector('[aria-label="Loading storage"]'),
        updating: !!document.querySelector(".storage-refreshing"),
      });
    requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
  location.hash = "/settings/storage";
  await until(() => !!document.querySelector(".storage-refreshing"));
  assert(
    rows().length === expanded &&
      !document.querySelector('[aria-label="Loading storage"]'),
    "Re-entry did not reuse the previous scan synchronously",
  );
  await until(() => !document.querySelector(".storage-refreshing"));
  watching = false;
  assert(
    frames.length &&
      frames.every((f) => f.count === expanded && !f.loading) &&
      frames.some((f) => f.updating),
    "Re-entry displayed empty/loading frames or collapsed the file list",
  );
  window.storageFixture.delay = 80;
  const total = document.querySelector(".storage-total").textContent;
  window.storageFixture.fail = true;
  refresh().click();
  assert(rows().length > 50, "Refresh cleared existing files");
  await until(() =>
    document
      .querySelector(".settings-service-error")
      ?.textContent.includes("Couldn't update"),
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
      !document.querySelector(".storage-refreshing") &&
      rows().length === expanded,
  );
  window.storageFixture.databaseMode = "failure";
  refresh().click();
  await until(() =>
    document
      .querySelector(".storage-database")
      ?.textContent.includes("Database details unavailable"),
  );
  assert(
    rows().length === expanded &&
      !!document.querySelector(".storage-total") &&
      !document.querySelector(".settings-service-error"),
    "SQL failure hid the file inventory",
  );
  window.storageFixture.databaseMode = "normal";
  refresh().click();
  await until(
    () =>
      !document
        .querySelector(".storage-database")
        ?.textContent.includes("Database details unavailable") &&
      document.querySelectorAll(".storage-legend").length === 2,
  );
  assert(
    !document
      .querySelector(".storage-settings")
      .textContent.includes("synthetic-private-value"),
    "Secret content leaked",
  );
  assert(
    !document
      .querySelector(".storage-settings")
      .textContent.match(
        /Largest first|Last scanned|SQLite pages|Collected data and cached files|This device|Reset workspace/,
      ),
    "Redundant storage copy remains",
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
    immediateCachedReentry: true,
    retainedVisiblePages: true,
    backgroundRefreshIndicator: true,
    individualFilesAbove50MBOnly: true,
    directoryActionsWithoutPathLine: true,
    filesBeforeDatabaseDetails: true,
    optionalDatabaseFailureRecovery: true,
    descendingBreakdownsWithMatchingLegends: true,
    compactAccessibleRefresh: true,
  };
}
const main = `import {app,BrowserWindow,ipcMain} from 'electron';
import {DataHost} from '${join(root, "packages/host/src/runtime.ts")}';
import {mkdirSync,writeFileSync,truncateSync} from 'node:fs';
import {join} from 'node:path';
app.setPath('userData',join(${JSON.stringify(output)},'profile'));
let host;const revealed=[];
app.whenReady().then(async()=>{
const dataDir=join(${JSON.stringify(output)},'data');mkdirSync(dataDir,{recursive:true});
writeFileSync(join(dataDir,'largest.bin'),'');truncateSync(join(dataDir,'largest.bin'),64*1024*1024+1);
writeFileSync(join(dataDir,'exact.bin'),'');truncateSync(join(dataDir,'exact.bin'),50*1024*1024);
writeFileSync(join(dataDir,'aifi-vault.key'),'synthetic-private-value');
mkdirSync(join(dataDir,'stock-logos'),{recursive:true});
for(let i=0;i<55;i++){const folder=join(dataDir,'sample-'+i);mkdirSync(folder);writeFileSync(join(folder,'data.json'),Buffer.alloc(300+i));}
mkdirSync(join(dataDir,'stock-logos','v2','nested'),{recursive:true});for(let i=0;i<80;i++)writeFileSync(join(dataDir,'stock-logos','v2','nested','logo-'+i+'.png'),Buffer.alloc(2048));
host=new DataHost(${JSON.stringify(join(root, "apps/desktop/dist/aifi"))},dataDir,true,(path,directory)=>{revealed.push({path,directory})});
ipcMain.handle('runtime',()=>({kind:'desktop',version:'test',platform:'darwin'}));ipcMain.handle('data',(_e,m,p)=>host.request(m,p));
const win=new BrowserWindow({show:false,width:1360,height:1100,webPreferences:{preload:join(${JSON.stringify(output)},'preload.cjs'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
try{await win.loadFile(join(${JSON.stringify(output)},'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');
if(revealed.length!==3||!revealed[0].path.endsWith('stock-logos')||!revealed[0].directory||!revealed[1].path.endsWith('largest.bin')||revealed[1].directory||!revealed[2].directory)throw Error('Native reveal paths incorrect');
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
