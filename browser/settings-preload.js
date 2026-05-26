const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chromexSettings", {
  getPaths: () => ipcRenderer.invoke("get-paths"),
  readFile: (p) => ipcRenderer.invoke("read-file", p),
  writeFile: (p, c) => ipcRenderer.invoke("write-file", p, c),
  apiGet: (path) => ipcRenderer.invoke("api-get", path),
  apiPostConfig: (body) => ipcRenderer.invoke("api-post-config", body),
});
