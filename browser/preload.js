const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chromex", {
  openSettings: () => ipcRenderer.invoke("open-settings"),
});
