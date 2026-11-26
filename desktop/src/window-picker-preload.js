const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowPicker', {
  select: (id) => ipcRenderer.send('window-capture:select', id),
  cancel: () => ipcRenderer.send('window-capture:cancel'),
  onSources: (listener) => ipcRenderer.on('window-capture:sources', (_event, sources) => listener(sources)),
});
