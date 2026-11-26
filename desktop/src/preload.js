const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cloudclip', {
  getState: () => ipcRenderer.invoke('history:list'),
  addText: (text) => ipcRenderer.invoke('history:add-text', text),
  copy: (id) => ipcRenderer.invoke('history:copy', id),
  remove: (id) => ipcRenderer.invoke('history:remove', id),
  clear: () => ipcRenderer.invoke('history:clear'),
  togglePin: (id) => ipcRenderer.invoke('history:toggle-pin', id),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
  captureRegion: () => ipcRenderer.invoke('capture:region'),
  captureWindow: () => ipcRenderer.invoke('capture:window'),
  captureScreen: () => ipcRenderer.invoke('capture:screen'),
  sendToCloudClip: (id) => ipcRenderer.invoke('sync:send', id),
  revealFile: (id) => ipcRenderer.invoke('history:reveal', id),
  openStorage: () => ipcRenderer.invoke('storage:open'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  onChanged: (listener) => {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on('history:changed', handler);
    return () => ipcRenderer.removeListener('history:changed', handler);
  },
  onCaptureMode: (listener) => {
    const handler = () => listener();
    ipcRenderer.on('capture:trigger', handler);
    return () => ipcRenderer.removeListener('capture:trigger', handler);
  },
  onWindowShown: (listener) => {
    const handler = (_event, options) => listener(options);
    ipcRenderer.on('window:shown', handler);
    return () => ipcRenderer.removeListener('window:shown', handler);
  },
});
