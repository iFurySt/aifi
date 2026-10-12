import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('aifiDesktop', Object.freeze({
  getRuntimeInfo: () => ipcRenderer.invoke('aifi:runtime-info'),
}));
