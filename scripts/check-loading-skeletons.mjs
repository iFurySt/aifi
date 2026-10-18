import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const reports = join(root, ".artifacts/loading-skeletons");
await mkdir(reports, { recursive: true });
const output = await mkdtemp(join(reports, "run-"));
await build({
  absWorkingDir: root,
  entryPoints: ["scripts/fixtures/loading-skeletons.tsx"],
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
async function checks(phase, config) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (v, message) => {
    if (!v) throw Error(message);
  };
  const until = async (fn) => {
    for (let i = 0; i < 200; i++) {
      if (fn()) return;
      await wait(20);
    }
    throw Error("Loading check timed out: " + fn.toString());
  };
  const group = () => document.querySelector(`[aria-label="${config.label}"]`);
  const f = window.loadingFixture;
  if (phase === "pending") {
    if (config.prepare) for (const key of config.prepare) f.release(key);
    if (config.search) {
      await until(() =>
        document.querySelector('[aria-label="Search the workspace"]'),
      );
      document.querySelector('[aria-label="Search the workspace"]').click();
    }
    await until(() => group()?.querySelector(".skeleton"));
    const region = group();
    assert(
      region.getAttribute("aria-busy") === "true",
      "Missing accessible loading state",
    );
    assert(
      !region.querySelector("button, input, a[href]"),
      "Skeleton contains fake interactive controls",
    );
    const shapes = [...region.querySelectorAll(".skeleton")];
    assert(
      shapes.every((s) => s.getAttribute("aria-hidden") === "true"),
      "Decorative shapes announced as data",
    );
    const shape = shapes.find((s) => s.getBoundingClientRect().width > 0);
    assert(
      shape && getComputedStyle(shape).animationName === "skeleton-shimmer",
      "Shared shimmer is missing",
    );
    assert(
      !/Loading(?: stocks| results| account| usage| activity| settings| more| price| storage)|Calculating storage/i.test(
        document.body.innerText,
      ),
      "Visible loading prose remains",
    );
    assert(
      !/No (?:matching stocks|credentials saved)/i.test(region.innerText),
      "Empty state displayed before a read finished",
    );
    assert(
      document.documentElement.scrollWidth <= innerWidth,
      "Skeleton causes horizontal viewport overflow",
    );
    return { label: config.label, skeletons: shapes.length, width: innerWidth };
  }
  if (phase === "reduced") {
    await until(() => group()?.querySelector(".skeleton"));
    assert(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
      "Media emulation failed",
    );
    assert(
      [...group().querySelectorAll(".skeleton")].every(
        (s) => getComputedStyle(s).animationName === "none",
      ),
      "Reduced-motion skeleton still animates",
    );
    return { reducedMotion: true };
  }
  if (phase === "settle") {
    f.empty = !!config.empty;
    if (config.failure) f.fail(config.failure);
    for (const key of [
      "directory",
      "identity",
      "research",
      "logos",
      "status",
      "models",
      "settings",
      "storage",
      "files",
      "details",
      "usage",
      "sync",
    ])
      if (key !== config.failure) f.release(key);
    await until(() => !group() || !group().querySelector(".skeleton"));
    if (config.failure)
      await until(() =>
        document.querySelector(
          '[role="alert"], .settings-service-error, .stock-no-data[role="status"]',
        ),
      );
    if (config.label === "Loading stocks")
      await until(() => document.querySelector(".stock-list-row"));
    if (config.route.includes("tab=chart") && !config.failure)
      await until(() =>
        document.querySelector(
          config.empty
            ? ".stock-price-section .stock-no-data"
            : ".stock-price-section svg",
        ),
      );
    if (config.route.includes("tab=chart") && !config.empty && !config.failure && !config.search) {
      f.hold("research");
      window.dispatchEvent(new Event("focus"));
      await wait(80);
      assert(document.querySelector(".stock-price-section svg") && !document.querySelector('[aria-label="Loading stock overview"]'), "Revalidation replaced the cached chart with skeletons");
      f.fail("research");
      await wait(60);
      assert(document.querySelector(".stock-price-section svg"), "Failed revalidation erased the cached chart");
    }
    if (config.label === "Loading storage" && !config.failure) {
      await until(() => document.querySelector(".storage-total"));
      await until(() =>
        document.querySelector('[aria-label="Loading database breakdown"]'),
      );
      // Details are optional and must not block the inventory.
      await until(
        () =>
          !document.querySelector('[aria-label="Loading database breakdown"]'),
      );
      const count = document.querySelectorAll(".storage-file-list > *").length;
      f.hold("files");
      document.querySelector(".storage-load-more").click();
      await until(() =>
        document.querySelector('[aria-label="Loading more files"]'),
      );
      assert(
        document.querySelectorAll(".storage-file-list > *").length >= count,
        "Paging erased existing storage files",
      );
      f.release("files");
      await until(
        () => !document.querySelector('[aria-label="Loading more files"]'),
      );
      f.hold("storage");
      document.querySelector('[aria-label="Refresh storage"]').click();
      await wait(60);
      assert(
        document.querySelector(".storage-total") && !group(),
        "Refreshing storage hid its cached inventory",
      );
      f.fail("storage");
      await until(() =>
        document.querySelector(
          '[role="alert"], .settings-service-error, .stock-no-data[role="status"]',
        ),
      );
      assert(
        document.querySelector(".storage-total"),
        "Failed storage refresh erased cached inventory",
      );
    }
    if (config.label === "Loading activity") {
      await until(() => document.querySelector(".usage-metrics"));
      f.hold("usage");
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Refresh")
        .click();
      await wait(60);
      assert(
        document.querySelector(".usage-metrics") && !group(),
        "Usage refresh erased cached totals",
      );
      f.release("usage");
    }
    return {
      settled: true,
      empty: !!config.empty,
      failure: config.failure || false,
    };
  }
}
const cases = [
  { route: "/stocks/AAPL?tab=chart", label: "Loading stocks" },
  ...["chart", "financials", "funds", "politicians", "insiders", "analyst"].map(
    (tab) => ({
      route: `/stocks/AAPL?tab=${tab}`,
      label: tab === "chart" ? "Loading stock overview" : `Loading ${tab}`,
    }),
  ),
  {
    route: "/stocks/AAPL?tab=chart",
    label: "Loading stock overview",
    empty: true,
  },
  {
    route: "/stocks/AAPL?tab=chart",
    label: "Loading stock overview",
    failure: "research",
  },
  {
    route: "/settings/appearance",
    label: "Loading search results",
    search: true,
  },
  { route: "/research", label: "Chat model", prepare: ["status"] },
  { route: "/settings/chatgpt", label: "Loading accounts" },
  { route: "/settings/chatgpt", label: "Loading accounts", failure: "status" },
  ...["sources", "keys", "sync"].map((section) => ({
    route: `/settings/${section}`,
    label: "Loading settings",
  })),
  {
    route: "/settings/sync",
    label: "Loading sync settings",
    prepare: ["settings"],
    failure: "sync",
  },
  { route: "/settings/storage", label: "Loading storage" },
  { route: "/settings/storage", label: "Loading storage", failure: "storage" },
  { route: "/watchlist", label: "Loading AAPL quote" },
];
// Usage is independently developed; cover it as soon as it is part of App routes.
const { readFile } = await import("node:fs/promises");
if (
  (await readFile(join(root, "packages/ui/src/App.tsx"), "utf8")).includes(
    '"usage"',
  )
)
  cases.push({ route: "/usage", label: "Loading activity" });
const main = `const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1400,height:850,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')console.error(e.message)});
 const run=(phase,c)=>win.webContents.executeJavaScript('('+${JSON.stringify(checks.toString())}+')('+JSON.stringify(phase)+','+JSON.stringify(c)+')');
 const load=async c=>{await win.loadFile(path.join(__dirname,'index.html'),{query:{route:c.route}});};
 try{const report=[];
 for(const c of ${JSON.stringify(cases)}){console.log(c.route,c.label);await load(c);report.push(await run('pending',c));report.push(await run('settle',c));}
 for(const [width,theme,tab] of [[1400,'light','chart'],[1400,'dark','chart'],[650,'dark','chart'],[390,'light','financials']]){
  win.setContentSize(width,850);const c={route:'/stocks/AAPL?tab='+tab,label:tab==='chart'?'Loading stock overview':'Loading '+tab};await load(c);await win.webContents.executeJavaScript('document.documentElement.dataset.theme='+JSON.stringify(theme));report.push(await run('pending',c));fs.writeFileSync(path.join(__dirname,theme+'-'+width+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});report.push(await run('reduced',{label:'Loading financials'}));win.webContents.debugger.detach();
 fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});setTimeout(()=>{console.error('Loading skeleton gate timed out');app.exit(1)},45000);`;
await writeFile(join(output, "main.cjs"), main);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  require("electron"),
  [join(output, "main.cjs"), "--no-sandbox"],
  { cwd: root, stdio: "inherit", env },
);
const timeout = setTimeout(() => child.kill("SIGKILL"), 50000);
const exit = await new Promise((r) =>
  child.once("exit", (code) => r(code ?? 1)),
);
clearTimeout(timeout);
await rm(join(output, "profile"), { recursive: true, force: true });
if (exit === 0) {
  for (const name of [
    "report.json",
    "light-1400.png",
    "dark-1400.png",
    "dark-650.png",
    "light-390.png",
  ])
    await copyFile(join(output, name), join(reports, name));
  await rm(output, { recursive: true, force: true });
}
process.exitCode = exit;
