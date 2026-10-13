import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld(
  "aifiDesktop",
  Object.freeze({
    getRuntimeInfo: () => ipcRenderer.invoke("aifi:runtime-info"),
    requestData: (method: string, params?: unknown) =>
      ipcRenderer.invoke("aifi:data", method, params),
  }),
);
