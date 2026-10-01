const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('wf', {
  version: () => ipcRenderer.invoke('wf:version'),
  updateState: () => ipcRenderer.invoke('wf:update-state'),
  installUpdate: () => ipcRenderer.invoke('wf:install-update'),
  onUpdate: (cb) => ipcRenderer.on('wf:update', (_e, m) => cb(m))
});
