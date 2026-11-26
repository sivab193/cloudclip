const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('captureOverlay', {
  complete: (selection) => ipcRenderer.send('capture:complete', selection),
  cancel: () => ipcRenderer.send('capture:cancel'),
});
