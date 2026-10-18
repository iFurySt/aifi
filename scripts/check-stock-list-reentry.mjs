import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/stock-list-reentry");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/stock-list-reentry.tsx"],
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
    for (let i = 0; i < 180; i++) {
      if (fn()) return;
      await wait(15);
    }
    throw Error("Timed out: " + fn.toString());
  };
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const rows = () =>
    document.querySelectorAll(".sidebar .stock-list-row").length;
  const list = () => document.querySelector(".sidebar .stock-list");
  const stats = window.reentry;
  await until(() => stats.reads === 1);
  location.hash = "/settings/appearance";
  await until(() => document.querySelector(".settings-content"));
  const links = [
    ...document.querySelectorAll(
      ".settings-nav-group:first-child .settings-nav-link",
    ),
  ];
  assert(
    links[1].getBoundingClientRect().top -
      links[0].getBoundingClientRect().bottom >=
      2,
    "Settings highlights touch",
  );
  stats.releaseDirectory();
  await until(() => stats.logos === 1);
  // The cached-artwork lane remains stalled. Committed directory rows must
  // become usable anyway, including when the first request finished offscreen.
  await wait(120);
  const samples = [];
  let sampling = true;
  const sample = () => {
    if (!sampling) return;
    if (document.querySelector(".stock-main"))
      samples.push({
        rows: rows(),
        loading: !!list()?.querySelector(":scope > .skeleton-group"),
      });
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  location.hash = "/stocks/AAPL?tab=chart";
  await until(() => rows() >= 50);
  assert(!stats.logoDone, "Logo gate was not stalled for the cold read check");
  stats.releaseLogos();
  await wait(60);
  assert(
    stats.reads === 1 && stats.logos === 1,
    "Returning restarted the unfinished local batch",
  );
  const initialReads = stats.reads;
  list().scrollTop = 650;
  const scroll = list().scrollTop;
  for (let i = 0; i < 3; i++) {
    location.hash = "/settings/appearance";
    await until(() => document.querySelector(".settings-content"));
    location.hash = "/stocks/AAPL?tab=chart";
    await until(() => rows() >= 50);
    assert(
      list().scrollTop === scroll,
      `Stocks return lost scroll: expected ${scroll}, actual ${list().scrollTop}, rows ${rows()}, reads ${stats.reads}`,
    );
  }
  assert(
    stats.reads === initialReads,
    "Fresh re-entry queried the directory again",
  );
  for (let i = 0; i < 3; i++) window.dispatchEvent(new Event("focus"));
  await wait(50);
  assert(stats.reads === initialReads, "Fresh focus repeated directory reads");
  assert(
    samples.length >= 4 &&
      samples.every((frame) => frame.rows > 0 && !frame.loading),
    "Warm Stocks return rendered an empty/loading frame",
  );
  const pick = async (text) => {
    document.querySelector('[aria-label="Stock collection"]').click();
    await until(() => document.querySelector('[role="option"]'));
    [...document.querySelectorAll('[role="option"]')]
      .find((x) => x.textContent === text)
      .click();
  };
  await pick("Nasdaq-100");
  await until(() => rows() === 30);
  await pick("All US listings");
  await until(() => rows() >= 50);
  assert(
    stats.reads === initialReads + 1,
    "Switching back to a known collection re-read it",
  );
  stats.failed = true;
  stats.time += 60_001;
  window.dispatchEvent(new Event("focus"));
  await until(() => list()?.innerText.includes("Directory unavailable"));
  assert(rows() >= 50, "Failed refresh erased saved local rows");
  stats.failed = false;
  [...list().querySelectorAll("button")]
    .find((x) => x.textContent === "Retry")
    .click();
  await until(() => !list()?.innerText.includes("Directory unavailable"));
  await wait(40);
  sampling = false;
  assert(samples.length >= 4, "No animation frames sampled");
  // New collection cold loads are allowed; returning to a warmed view is not.
  const report = {
    pendingReadSurvivesUnmount: true,
    freshReentryReads: 0,
    collectionCache: true,
    scrollRestored: true,
    offlineRetainsRows: true,
    settingsRowGap: true,
    frames: samples.length,
  };
  return report;
}

const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{
const win=new BrowserWindow({show:false,width:1440,height:950,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
try{await win.loadFile(path.join(__dirname,'index.html'));const report=await win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')()');fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(e){console.error(e);fs.writeFileSync(path.join(__dirname,'failure.png'),(await win.webContents.capturePage()).toPNG());app.exit(1)}});setTimeout(()=>app.exit(1),15000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 20000);
const code = await new Promise((resolve) =>
  child.once("exit", (code) => resolve(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (code === 0) {
  await copyFile(join(output, "report.json"), join(reports, "report.json"));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = code;
