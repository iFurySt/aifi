import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/company-news");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/company-news.tsx"],
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
async function checks(phase = "content") {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f) => {
    for (let i = 0; i < 150; i++) {
      if (f()) return;
      await wait(20);
    }
    throw Error("News check timed out " + location.hash + " " + f);
  };
  const assert = (ok, msg) => {
    if (!ok) throw Error(msg);
  };
  const section = () => document.querySelector(".stock-news-overview");
  await until(
    () => section()?.querySelectorAll(".stock-news-item").length === 3,
  );
  if (phase === "layout") {
    const area = section();
    area.scrollIntoView({ block: "center" });
    assert(
      document.documentElement.scrollWidth <= innerWidth,
      "Window widened",
    );
    for (const el of area.querySelectorAll("h3,small,p"))
      assert(el.scrollWidth <= el.clientWidth + 1, "News text overflows");
    return {
      width: innerWidth,
      theme: document.documentElement.dataset.theme,
      contentFits: true,
    };
  }
  const rows = [...section().querySelectorAll(".stock-news-item")];
  assert(
    rows[0].querySelector("h3").textContent === "Latest company development",
    "Order/duplicate wrong",
  );
  const a = rows[0].querySelector("a");
  assert(
    a.href === "https://finance.yahoo.com/news/latest.html" &&
      a.target === "_blank" &&
      a.rel.includes("noopener"),
    "Original link unsafe",
  );
  assert(!rows[2].querySelector("a"), "Unsafe link became clickable");
  assert(
    rows[0].querySelector("time").dateTime === "2026-10-19T14:34:20Z",
    "Publication timestamp lost",
  );
  assert(
    rows[0].textContent.includes("source-provided snippet"),
    "Source snippet missing",
  );
  for (const [symbol, message] of [
    ["EMPTY", "No recent news in this source window"],
    ["OFF", "Sync is off"],
  ]) {
    location.hash = "/stocks/" + symbol + "?tab=chart";
    await until(() => section()?.textContent.includes(message));
  }
  location.hash = "/settings/sync";
  await until(() => document.querySelector('[aria-label="News source"]'));
  document.querySelector('[aria-label="News source"]').click();
  await until(() => document.querySelector('[role="listbox"]'));
  const options = [...document.querySelectorAll('[role="option"]')];
  assert(
    options.some((o) => o.textContent.includes("No key")) &&
      options.some((o) => o.textContent.includes("FMP")),
    "News sources missing",
  );
  options.find((o) => o.textContent.includes("FMP")).click();
  await until(() => window.newsFixture.config.newsSource === "fmp");
  assert(
    !window.newsFixture.calls.some(
      (m) => m.includes("sync") || m.includes("collect"),
    ),
    "Page read/selection silently collected",
  );
  location.hash = "/stocks/AAPL?tab=chart";
  await until(
    () => section()?.querySelectorAll(".stock-news-item").length === 3,
  );
  return {
    localHeadlines: true,
    orderedDeduplicated: true,
    safeOriginalLinks: true,
    publicationDate: true,
    emptyAndDisabled: true,
    sourceSelection: true,
    noCollection: true,
  };
}
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');app.setPath('userData',path.join(__dirname,'profile'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});try{await win.loadFile(path.join(__dirname,'index.html'));const run=p=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(p)+')');const report=[await run('content')];for(const [width,theme] of [[1440,'light'],[650,'dark'],[390,'light']]){win.setContentSize(width,1000);await win.webContents.executeJavaScript('document.documentElement.dataset.theme='+JSON.stringify(theme));await new Promise(r=>setTimeout(r,80));report.push(await run('layout'));fs.writeFileSync(path.join(__dirname,'news-'+width+'.png'),(await win.webContents.capturePage()).toPNG());}fs.writeFileSync(path.join(__dirname,'news.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0)}catch(e){console.error(e);app.exit(1)}});setTimeout(()=>app.exit(1),20000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 20000);
const exit = await new Promise((r) =>
  child.once("exit", (code) => r(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  for (const name of ["report.json", "news.png"])
    await copyFile(join(output, name), join(reports, name));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
