import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld(
  "aifiDesktop",
  Object.freeze({
    getRuntimeInfo: () => ipcRenderer.invoke("aifi:runtime-info"),
    requestData: (method: string, params?: unknown) =>
      ipcRenderer.invoke("aifi:data", method, params),
    requestChatGPT: (method: string, params?: unknown) =>
      ipcRenderer.invoke("aifi:chatgpt", method, params),
    onChatGPTDelta: (
      callback: (event: { requestId: string; text: string }) => void,
    ) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        value: { requestId: string; text: string },
      ) => callback(value);
      ipcRenderer.on("aifi:chatgpt-delta", listener);
      return () => ipcRenderer.removeListener("aifi:chatgpt-delta", listener);
    },
  }),
);
