const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wf', {
  shopState: () => ipcRenderer.invoke('wf:shop-state'),
  shopAction: req => ipcRenderer.invoke('wf:shop-action', req),
  shopChat: req => ipcRenderer.invoke('wf:shop-chat', req),
  shopCancel: () => ipcRenderer.invoke('wf:shop-cancel'),
  version: () => ipcRenderer.invoke('wf:version'),
  updateState: () => ipcRenderer.invoke('wf:update-state'),
  installUpdate: () => ipcRenderer.invoke('wf:install-update'),
  spotify: (cmd, arg) => ipcRenderer.invoke('wf:spotify', cmd, arg),
  loadSave: () => ipcRenderer.invoke('wf:load-save'),
  writeSave: (o) => ipcRenderer.invoke('wf:write-save', o),
  onUpdate: (cb) => ipcRenderer.on('wf:update', (_e, m) => cb(m))
});
