const path = require('node:path');
const {
  app, BrowserWindow, Menu, Notification, Tray, clipboard, desktopCapturer,
  globalShortcut, ipcMain, nativeImage, nativeTheme, screen, shell,
} = require('electron');
const { HistoryStore, hash } = require('./history-store');

let mainWindow;
let tray;
let store;
let pollTimer;
let previousClipboardHash = '';
let overlayWindows = [];
const APP_URL = 'https://us.cclip.cc';

function menuBarIcon() {
  return nativeImage.createFromPath(path.join(__dirname, 'assets', 'app-icon.png')).resize({ width: 18, height: 18 });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040, height: 720, minWidth: 760, minHeight: 540,
    title: 'CloudClip', backgroundColor: nativeTheme.shouldUseDarkColors ? '#10151b' : '#f6f5f1',
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) { event.preventDefault(); mainWindow.hide(); }
  });
}

function showWindow(quickPick = false) {
  if (!mainWindow) createWindow();
  mainWindow.show();
  mainWindow.focus();
  const notifyRenderer = () => mainWindow.webContents.send('window:shown', { quickPick });
  if (mainWindow.webContents.isLoading()) mainWindow.webContents.once('did-finish-load', notifyRenderer);
  else notifyRenderer();
}

function toggleWindow() {
  if (mainWindow?.isVisible() && mainWindow.isFocused()) mainWindow.hide();
  else showWindow(true);
}

function broadcast() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('history:changed', store.list());
  rebuildTrayMenu();
}

function startClipboardMonitor() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!store.list().settings.monitorClipboard) return;
    const clipboardText = await Promise.resolve(clipboard.readText());
    const text = typeof clipboardText === 'string' ? clipboardText : '';
    const image = await readClipboardImage();
    let item = null;
    if (text.trim()) {
      const digest = hash(`text:${text}`);
      if (digest !== previousClipboardHash) item = store.addText(text);
      previousClipboardHash = digest;
    } else if (!image.isEmpty()) {
      const png = image.toPNG();
      const digest = hash(png);
      if (digest !== previousClipboardHash) item = store.addImage(png);
      previousClipboardHash = digest;
    }
    if (item) broadcast();
  }, 750);
}

async function readClipboardImage() {
  if (typeof clipboard.readImage === 'function') return Promise.resolve(clipboard.readImage());
  if (typeof clipboard.readBuffer !== 'function') return nativeImage.createEmpty();
  for (const format of ['public.png', 'image/png', 'public.tiff', 'image/tiff']) {
    try {
      const bytes = await Promise.resolve(clipboard.readBuffer(format));
      const image = bytes.length ? nativeImage.createFromBuffer(bytes) : nativeImage.createEmpty();
      if (!image.isEmpty()) return image;
    } catch { /* format not present */ }
  }
  return nativeImage.createEmpty();
}

function rebuildTrayMenu() {
  if (!tray || !store) return;
  const recent = store.list().items.slice(0, 5).map((item, index) => ({
    label: `${index + 1}. ${item.type === 'text' ? item.text.replace(/\s+/g, ' ').slice(0, 38) : `Screen capture · ${new Date(item.createdAt).toLocaleTimeString()}`}`,
    accelerator: `CommandOrControl+Alt+${index + 1}`,
    click: () => copyItem(item.id),
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Quick History', accelerator: 'CommandOrControl+Shift+V', click: () => showWindow(true) },
    { label: 'Capture Region', accelerator: 'CommandOrControl+Shift+5', click: captureRegion },
    { label: 'Capture Screen', click: captureScreen },
    { type: 'separator' },
    ...(recent.length ? recent : [{ label: 'No recent clips', enabled: false }]),
    { type: 'separator' },
    { label: 'Quit CloudClip', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

async function copyRecent(index) {
  const item = store.list().items[index];
  if (!item || !await copyItem(item.id)) return;
  if (Notification.isSupported()) {
    new Notification({ title: 'Copied from CloudClip', body: `Recent item ${index + 1} is ready to paste.` }).show();
  }
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+V', () => showWindow(true));
  globalShortcut.register('CommandOrControl+Shift+5', captureRegion);
  for (let index = 0; index < 5; index++) {
    globalShortcut.register(`CommandOrControl+Alt+${index + 1}`, () => void copyRecent(index));
  }
}

async function copyItem(id) {
  const item = store.list().items.find((candidate) => candidate.id === id);
  if (!item) return false;
  if (item.type === 'text') {
    await Promise.resolve(clipboard.writeText(item.text));
    previousClipboardHash = item.hash;
  } else if (item.path) {
    const image = nativeImage.createFromPath(item.path);
    if (typeof clipboard.writeImage === 'function') await Promise.resolve(clipboard.writeImage(image));
    else if (typeof clipboard.writeBuffer === 'function') await Promise.resolve(clipboard.writeBuffer('public.png', image.toPNG()));
    else return false;
    previousClipboardHash = item.hash;
  }
  return true;
}

async function getScreenSource(display) {
  const sources = await desktopCapturer.getSources({
    types: ['screen'], thumbnailSize: {
      width: Math.round(display.size.width * display.scaleFactor),
      height: Math.round(display.size.height * display.scaleFactor),
    },
  });
  return sources.find((source) => source.display_id === String(display.id)) || sources[0];
}

async function captureScreen() {
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const source = await getScreenSource(display);
    if (!source || source.thumbnail.isEmpty()) return false;
    store.addImage(source.thumbnail.toPNG(), 'full-screen capture');
    broadcast();
    return true;
  } catch { return false; }
}

async function captureRegion() {
  closeOverlays();
  const displays = screen.getAllDisplays();
  for (const display of displays) {
    const source = await getScreenSource(display);
    if (!source) continue;
    const overlay = new BrowserWindow({
      ...display.bounds, frame: false, transparent: true, alwaysOnTop: true,
      skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
      webPreferences: { preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, sandbox: true },
    });
    overlay.capturePayload = { image: source.thumbnail, display };
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    await overlay.loadFile(path.join(__dirname, 'overlay.html'));
    overlay.webContents.send('capture:trigger');
    overlayWindows.push(overlay);
  }
  return true;
}

function closeOverlays() {
  for (const window of overlayWindows) if (!window.isDestroyed()) window.destroy();
  overlayWindows = [];
}

function registerIpc() {
  ipcMain.handle('history:list', () => store.list());
  ipcMain.handle('history:add-text', (_event, text) => { const item = store.addText(text, 'manual'); broadcast(); return item; });
  ipcMain.handle('history:copy', (_event, id) => copyItem(id));
  ipcMain.handle('history:remove', (_event, id) => { const result = store.remove(id); broadcast(); return result; });
  ipcMain.handle('history:clear', () => { store.clear(); broadcast(); return true; });
  ipcMain.handle('history:toggle-pin', (_event, id) => { const result = store.togglePin(id); broadcast(); return result; });
  ipcMain.handle('history:reveal', (_event, id) => {
    const item = store.list().items.find((candidate) => candidate.id === id);
    if (item?.path) shell.showItemInFolder(item.path);
    return Boolean(item?.path);
  });
  ipcMain.handle('settings:update', (_event, settings) => {
    const result = store.updateSettings(settings);
    app.setLoginItemSettings({ openAtLogin: result.launchAtLogin, openAsHidden: true });
    broadcast();
    return result;
  });
  ipcMain.handle('capture:region', captureRegion);
  ipcMain.handle('capture:screen', captureScreen);
  ipcMain.handle('window:show', () => { showWindow(); return true; });
  ipcMain.handle('window:hide', () => { mainWindow?.hide(); return true; });
  ipcMain.handle('sync:send', async (_event, id) => {
    const item = store.list().items.find((candidate) => candidate.id === id);
    if (!item) return { ok: false, message: 'Clip no longer exists.' };
    if (item.type === 'image') return { ok: false, message: 'Cloud sync currently supports text clips only.' };
    await Promise.resolve(clipboard.writeText(item.text));
    previousClipboardHash = item.hash;
    store.markSynced(id);
    await shell.openExternal(`${APP_URL}/?login=1`);
    broadcast();
    return { ok: true, message: 'Copied locally and opened CloudClip. Paste, then save when you are ready to sync.' };
  });
  ipcMain.on('capture:cancel', closeOverlays);
  ipcMain.on('capture:complete', (event, selection) => {
    const overlay = BrowserWindow.fromWebContents(event.sender);
    const payload = overlay?.capturePayload;
    if (!payload || selection.width < 2 || selection.height < 2) return closeOverlays();
    const size = payload.image.getSize();
    const scaleX = size.width / payload.display.bounds.width;
    const scaleY = size.height / payload.display.bounds.height;
    const crop = {
      x: Math.max(0, Math.round(selection.x * scaleX)), y: Math.max(0, Math.round(selection.y * scaleY)),
      width: Math.min(size.width, Math.round(selection.width * scaleX)),
      height: Math.min(size.height, Math.round(selection.height * scaleY)),
    };
    const result = payload.image.crop(crop);
    closeOverlays();
    if (!result.isEmpty()) { store.addImage(result.toPNG(), 'region capture'); broadcast(); showWindow(); }
  });
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Clip', submenu: [
      { label: 'Open Quick History', accelerator: 'CommandOrControl+Shift+V', click: () => showWindow(true) },
      { type: 'separator' },
      { label: 'Capture Region', accelerator: 'CommandOrControl+Shift+5', click: captureRegion },
      { label: 'Capture Screen', accelerator: 'CommandOrControl+Shift+6', click: captureScreen },
      { type: 'separator' }, { role: 'close' },
    ] },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]));
}

app.whenReady().then(() => {
  store = new HistoryStore(app.getPath('userData'));
  registerIpc();
  installMenu();
  createWindow();
  tray = new Tray(menuBarIcon());
  tray.setTitle(' CC', { fontType: 'monospacedDigit' });
  tray.setToolTip('CloudClip — local clipboard history');
  tray.on('click', toggleWindow);
  rebuildTrayMenu();
  startClipboardMonitor();
  registerShortcuts();
});

app.on('activate', () => showWindow());
app.on('before-quit', () => { app.isQuitting = true; clearInterval(pollTimer); globalShortcut.unregisterAll(); closeOverlays(); });
app.on('window-all-closed', () => { /* menu-bar utility remains available */ });
