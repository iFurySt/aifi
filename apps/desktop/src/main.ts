import { app, BrowserWindow, ipcMain, session } from "electron";
import { join } from "node:path";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

async function createWindow() {
  const window = new BrowserWindow({
    title: "AIFi",
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
      await waitFor(() => !!document.querySelector('.agents-page') && document.documentElement.dataset.runtime === 'desktop');
      const initialHistory = document.querySelector('[aria-label="Go back"]').disabled && document.querySelector('[aria-label="Go forward"]').disabled;
      document.querySelector('a[href="#/watchlist"]').click();
      await waitFor(() => !!document.querySelector('.watchlist-table'));
      const navigation = document.querySelectorAll('.watchlist-table tbody tr').length === 5;
      const back = document.querySelector('[aria-label="Go back"]');
      await waitFor(() => !back.disabled);
      back.click();
      await waitFor(() => !!document.querySelector('.agents-page'));
      const forward = document.querySelector('[aria-label="Go forward"]');
      await waitFor(() => !forward.disabled);
      forward.click();
      await waitFor(() => !!document.querySelector('.watchlist-table'));
      const historyControls = !document.querySelector('[aria-label="Go back"]').disabled;
      back.click();
      await waitFor(() => !!document.querySelector('.agents-page'));
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
      document.querySelector('a[href="#/agents"]').click();
      await waitFor(() => !!document.querySelector('.agents-page') && document.documentElement.dataset.theme === 'light');
      return { runtime, navigation, initialHistory, historyControls, branchingHistory, framedShell, localSave, isolated: typeof require === 'undefined',
        rendered: !!document.querySelector('.agents-page'),
        theme: document.documentElement.dataset.theme,
        desktop: document.documentElement.dataset.runtime,
        externalAssets: [...document.querySelectorAll('script[src],link[href]')]
          .some(el => /^https?:/.test(el.getAttribute('src') || el.getAttribute('href') || '')) };
    })()`);
    if (
      result.runtime?.kind !== "desktop" ||
      !result.isolated ||
      !result.navigation ||
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
      JSON.stringify(result, null, 2),
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
    session.defaultSession.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    ipcMain.handle("aifi:runtime-info", () => ({
      kind: "desktop",
      version: app.getVersion(),
      platform: process.platform,
    }));
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
