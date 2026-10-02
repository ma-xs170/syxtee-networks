const { contextBridge, ipcRenderer } = require("electron");

// Surface minimale exposée à la fenêtre : aucune API Node, seulement ces appels.
contextBridge.exposeInMainWorld("link", {
  state: () => ipcRenderer.invoke("state"),
  pair: (code) => ipcRenderer.invoke("pair", code),
  unpair: () => ipcRenderer.invoke("unpair"),
  setObs: (v) => ipcRenderer.invoke("setObs", v),
  setBackup: (v) => ipcRenderer.invoke("setBackup", v),
  options: () => ipcRenderer.invoke("options"),
  autostart: (on) => ipcRenderer.invoke("autostart", on),
  open: (url) => ipcRenderer.invoke("open", url),
  onState: (fn) => ipcRenderer.on("state", (_e, s) => fn(s)),
});
