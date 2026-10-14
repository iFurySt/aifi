import { DataHost } from "../../../packages/host/src/runtime";
import {
  dataMethods,
  type DataMethod,
} from "../../../packages/core/src/data-service";
import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  Menu,
  nativeImage,
} from "electron";
import { join, sep, basename } from "node:path";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

app.setName("AIFi");
const devUrl = process.env.AIFI_DEV_URL;
const smoke = process.argv.includes("--smoke");
if (devUrl && devUrl !== "http://127.0.0.1:5173") {
  throw new Error("AIFI_DEV_URL must be the local AIFi development server.");
}
// Smoke checks use a disposable profile, never the user's desktop workspace.
const smokeProfile = smoke
  ? mkdtempSync(join(tmpdir(), "aifi-smoke-"))
  : undefined;
if (smokeProfile) {
  app.setPath("userData", smokeProfile);
  app.once("quit", () => {
    try {
      rmSync(smokeProfile, { recursive: true, force: true });
    } catch {
      /* OS may retain a cache handle until exit. */
    }
  });
}

let dataHost: DataHost;
let quitting = false;
app.on("before-quit", (event) => {
  if (quitting || !dataHost) return;
  event.preventDefault();
  quitting = true;
  void dataHost.stop().finally(() => app.quit());
});
async function createWindow() {
  const window = new BrowserWindow({
    title: "AIFi",
    icon: join(__dirname, "brand/app-icon.png"),
    width: 1360,
    height: 1000,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: "#f0f0f0",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 14, y: 17 } }
      : {}),
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const restrictNavigation = (event: Electron.Event, url: string) => {
    const current = window.webContents.getURL().split("#")[0];
    if (url.split("#")[0] !== current) event.preventDefault();
  };
  window.webContents.on("will-navigate", restrictNavigation);
  window.webContents.on("will-redirect", restrictNavigation);
  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(`AIFi renderer stopped: ${details.reason}`);
    if (smoke) app.exit(1);
  });
  if (devUrl) await window.loadURL(devUrl);
  else await window.loadFile(join(__dirname, "../../web/dist/index.html"));
  if (smoke) {
    const result = await window.webContents.executeJavaScript(`(async () => {
      const runtime = await window.aifiDesktop?.getRuntimeInfo();
      const waitFor = async (check) => {
        const deadline = Date.now() + 4000;
        while (!check()) { if (Date.now() > deadline) throw Error('Renderer did not settle'); await new Promise(resolve => setTimeout(resolve, 20)); }
      };
      await waitFor(() => !!document.querySelector('.stocks-page') && document.documentElement.dataset.runtime === 'desktop');
      const initialHistory = document.querySelector('[aria-label="Go back"]').disabled && document.querySelector('[aria-label="Go forward"]').disabled;
      document.querySelector('a[href="#/watchlist"]').click();
      await waitFor(() => !!document.querySelector('.watchlist-table'));
      const navigation = document.querySelectorAll('.watchlist-table tbody tr').length === 5;
      const back = document.querySelector('[aria-label="Go back"]');
      await waitFor(() => !back.disabled);
      back.click();
      await waitFor(() => !!document.querySelector('.stocks-page'));
      const forward = document.querySelector('[aria-label="Go forward"]');
      await waitFor(() => !forward.disabled);
      forward.click();
      await waitFor(() => !!document.querySelector('.watchlist-table'));
      const historyControls = !document.querySelector('[aria-label="Go back"]').disabled;
      back.click();
      await waitFor(() => !!document.querySelector('.stocks-page'));
      document.querySelector('a[href="#/library"]').click();
      await waitFor(() => !!document.querySelector('.library-grid') && document.querySelector('[aria-label="Go forward"]').disabled);
      const branchingHistory = document.querySelector('[aria-label="Go forward"]').disabled;
      document.querySelector('[aria-label="Collapse sidebar"]').click();
      await waitFor(() => getComputedStyle(document.querySelector('.sidebar')).display === 'none');
      document.querySelector('[aria-label="Expand sidebar"]').click();
      await waitFor(() => getComputedStyle(document.querySelector('.sidebar')).display !== 'none');
      const framedShell = !!document.querySelector('.window-toolbar') && getComputedStyle(document.querySelector('.workspace-panel')).borderTopLeftRadius === '16px';
      document.querySelector('[aria-label="Switch to dark theme"]').click();
      await waitFor(() => document.documentElement.dataset.theme === 'dark' && !!localStorage.getItem('aifi.workspace.v1'));
      const localSave = JSON.parse(localStorage.getItem('aifi.workspace.v1')).theme === 'dark';
      document.querySelector('[aria-label="Switch to light theme"]').click();
      document.querySelector('.rail-destinations a[href^="#/stocks/"]').click();
      await waitFor(() => !!document.querySelector('.stocks-page') && document.documentElement.dataset.theme === 'light');
      const stockTabs = [...document.querySelectorAll('[role="tab"]')].map(el => el.textContent).join(',') === 'Chart,Financials,Funds,Politicians,Insiders,Analyst';
      const stockSidebar = !!document.querySelector('.stock-sidebar') && document.querySelectorAll('.rail-destinations a').length === 6;
      document.querySelector('[role="tab"][id="stock-tab-funds"]').click();
      await waitFor(() => !!document.querySelector('#stock-panel-funds .stock-table-empty'));
      const stockPlaceholders = document.body.innerText.includes('No holdings data');
      document.querySelector('[role="tab"][id="stock-tab-chart"]').click();
      await waitFor(() => !!document.querySelector('#stock-panel-chart .stock-price-chart'));
      const directoryPage = await window.aifiDesktop.requestData('directory.list', {query:'',limit:50,offset:0});
      const directoryLookup = await window.aifiDesktop.requestData('directory.get', {symbol:'AAPL'});
      await waitFor(() => document.querySelector('.stock-list')?.getAttribute('aria-busy') === 'false');
      const directoryReads = directoryPage.total === 0 && directoryPage.items.length === 0 && directoryLookup.item === null && document.querySelector('.stock-list').innerText.includes('No directory yet') && document.querySelector('.stock-company-header h1').textContent === 'AAPL';
      const initialData = await window.aifiDesktop.requestData('status');
      const saved = await window.aifiDesktop.requestData('settings.save', {...initialData.settings, intervalHours:6, automatic:false});
      await window.aifiDesktop.requestData('credentials.set', {provider:'massive',values:{apiKey:'synthetic-native-test-key'}});
      const configured = await window.aifiDesktop.requestData('status');
      const dataService = configured.settings.intervalHours === 6 && !configured.settings.automatic && configured.offline === true;
      let privateFilesBlocked = false;
      try { await fetch('file://' + configured.dataDir + '/aifi-vault.key'); } catch { privateFilesBlocked = true; }
      const credentials = privateFilesBlocked && configured.credentials.some(x => x.provider === 'massive') && !JSON.stringify(configured).includes('synthetic-native-test-key');
      await window.aifiDesktop.requestData('credentials.remove', {provider:'massive'});
      location.hash = '/settings/sync';
      await waitFor(() => !!document.querySelector('.settings-content') && document.querySelector('[aria-label="Directory interval hours"]')?.value === '6');
      const settingsUI = document.querySelectorAll('[aria-label="Settings categories"] a').length === 5;
      const brand = document.querySelector('.brand-mark');
      const maskImage = brand && getComputedStyle(brand).maskImage;
      const maskURL = maskImage?.startsWith('url(') ? maskImage.slice(4, -1).replaceAll('"', '').replaceAll("'", '') : null;
      const brandLoaded = maskURL ? await new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = maskURL; }) : false;
      const branding = document.title === 'AIFi' && !!brand && brandLoaded && brand.getBoundingClientRect().width > 0;
      return { runtime, branding, directoryReads, dataService, credentials, settingsUI, stockTabs, stockSidebar, stockPlaceholders, navigation, initialHistory, historyControls, branchingHistory, framedShell, localSave, isolated: typeof require === 'undefined',
        rendered: !!document.querySelector('.settings-content'),
        theme: document.documentElement.dataset.theme,
        desktop: document.documentElement.dataset.runtime,
        externalAssets: [...document.querySelectorAll('script[src],link[href]')]
          .some(el => /^https?:/.test(el.getAttribute('src') || el.getAttribute('href') || '')) };
    })()`);
    if (
      result.runtime?.kind !== "desktop" ||
      !result.isolated ||
      !result.branding ||
      !result.navigation ||
      !result.dataService ||
      !result.directoryReads ||
      !result.credentials ||
      !result.settingsUI ||
      !result.stockTabs ||
      !result.stockSidebar ||
      !result.stockPlaceholders ||
      !result.initialHistory ||
      !result.historyControls ||
      !result.branchingHistory ||
      !result.framedShell ||
      !result.localSave ||
      !result.rendered ||
      result.desktop !== "desktop" ||
      result.externalAssets
    ) {
      throw new Error(`Desktop smoke check failed: ${JSON.stringify(result)}`);
    }
    const output = join(__dirname, "../../../.artifacts");
    mkdirSync(output, { recursive: true });
    // Wait for the last route/theme transition to paint before taking evidence.
    await window.webContents.executeJavaScript(`(() => {
      const still = document.createElement('style');
      still.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
      document.head.append(still);
    })()`);
    await delay(180);
    await window.webContents.executeJavaScript(
      "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    );
    const screenshot = await window.webContents.capturePage();
    writeFileSync(join(output, "aifi-electron.png"), screenshot.toPNG());
    writeFileSync(
      join(output, "electron-smoke.json"),
      JSON.stringify({ ...result, goPid: dataHost.pid }, null, 2),
    );
    console.log(
      "AIFi desktop smoke passed: bundled renderer, isolated bridge, local assets.",
    );
    app.quit();
  }
}

const smokeTimeout = smoke
  ? setTimeout(() => {
      console.error("Desktop smoke timed out.");
      app.exit(1);
    }, 15000)
  : undefined;
void app
  .whenReady()
  .then(async () => {
    const iconPath = join(__dirname, "brand/app-icon.png");
    const brandIcon = nativeImage.createFromPath(iconPath);
    if (brandIcon.isEmpty()) throw Error("AIFi app icon is unavailable.");
    app.dock?.setIcon(brandIcon);
    app.setAboutPanelOptions({
      applicationName: "AIFi",
      applicationVersion: app.getVersion(),
      iconPath,
    });
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        ...(process.platform === "darwin"
          ? [
              {
                label: "AIFi",
                submenu: [
                  { role: "about" as const },
                  { type: "separator" as const },
                  { role: "services" as const },
                  { type: "separator" as const },
                  { role: "hide" as const },
                  { role: "hideOthers" as const },
                  { role: "unhide" as const },
                  { type: "separator" as const },
                  { role: "quit" as const },
                ],
              },
            ]
          : []),
        { role: "fileMenu" },
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
      ]),
    );
    session.defaultSession.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    const assetRoot = realpathSync(join(__dirname, "../../web/dist"));
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["<all_urls>"] },
      (details, callback) => {
        let allowed = false;
        try {
          const target = new URL(details.url);
          if (
            devUrl &&
            ["http://127.0.0.1:5173", "ws://127.0.0.1:5173"].includes(
              target.origin,
            )
          )
            allowed = true;
          else if (!devUrl && target.protocol === "file:") {
            const path = realpathSync(fileURLToPath(target));
            allowed =
              path.startsWith(assetRoot + sep) &&
              !basename(path).startsWith("aifi-vault.") &&
              !/\.sqlite(?:-wal|-shm)?$/.test(path);
          } else if (target.protocol === "data:") allowed = true;
        } catch {
          /* Invalid or out-of-scope resources remain denied. */
        }
        callback({ cancel: !allowed });
      },
    );
    ipcMain.handle("aifi:runtime-info", () => ({
      kind: "desktop",
      version: app.getVersion(),
      platform: process.platform,
    }));
    dataHost = new DataHost(
      join(__dirname, process.platform === "win32" ? "aifi.exe" : "aifi"),
      smokeProfile ? join(smokeProfile, "data") : undefined,
      smoke,
    );
    try {
      await dataHost.start();
    } catch {
      console.error("AIFi data service could not start.");
    }
    ipcMain.handle(
      "aifi:data",
      (event, method: DataMethod, params?: unknown) => {
        const frame = event.senderFrame;
        const url = frame?.url.split("#")[0];
        const expected =
          devUrl ||
          pathToFileURL(join(__dirname, "../../web/dist/index.html")).href;
        if (
          frame !== event.sender.mainFrame ||
          (devUrl
            ? url !== expected + "/" && url !== expected
            : url !== expected) ||
          !dataMethods.includes(method)
        )
          throw Error("Data access denied.");
        return dataHost.request(method, params);
      },
    );
    await createWindow();
    if (smokeTimeout) clearTimeout(smokeTimeout);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0)
        void createWindow().catch(failStartup);
    });
  })
  .catch(failStartup);
function failStartup(error: unknown) {
  console.error("AIFi could not start:", error);
  app.exit(1);
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || smoke) app.quit();
});
