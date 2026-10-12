import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';

app.setName('AIFi');
const devUrl = process.env.AIFI_DEV_URL;
if (devUrl && devUrl !== 'http://127.0.0.1:5173') {
  throw new Error('AIFI_DEV_URL must be the local AIFi development server.');
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'AIFi',
    width: 1360,
    height: 900,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: '#ffffff',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL().split('#')[0];
    if (url.split('#')[0] !== current) event.preventDefault();
  });
  if (devUrl) void window.loadURL(devUrl);
  else void window.loadFile(join(__dirname, '../../web/dist/index.html'));
}

void app.whenReady().then(() => {
  ipcMain.handle('aifi:runtime-info', () => ({
    kind: 'desktop',
    version: app.getVersion(),
    platform: process.platform,
  }));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
