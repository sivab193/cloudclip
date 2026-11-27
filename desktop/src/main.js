const path = require('node:path');
const {
  app, BrowserWindow, ClipboardItem, Menu, Notification, Tray, clipboard, desktopCapturer,
  globalShortcut, ipcMain, nativeImage, nativeTheme, screen, shell,
} = require('electron');
const { HistoryStore, hash } = require('./history-store');

let mainWindow;
let tray;
let store;
let pollTimer;
let previousClipboardHash = '';
let overlayWindows = [];
let windowPicker;
let windowCaptureSources = new Map();
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
    if (!image.isEmpty()) {
      const png = image.toPNG();
      const digest = hash(png);
      if (digest !== previousClipboardHash) item = store.addImage(png);
      previousClipboardHash = digest;
    } else if (text.trim()) {
      const digest = hash(`text:${text}`);
      if (digest !== previousClipboardHash) item = store.addText(text);
      previousClipboardHash = digest;
    }
    if (item) broadcast();
  }, 750);
}

async function readClipboardImage() {
  const items = await clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));
    if (!imageType) continue;
    try {
      const blob = await item.getType(imageType);
      const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      if (!image.isEmpty()) return image;
    } catch { /* unreadable image representation */ }
  }
  return nativeImage.createEmpty();
}

function rebuildTrayMenu() {
  if (!tray || !store) return;
  const recent = store.list().items.slice(0, 5).map((item, index) => ({
    label: `${index + 1}. ${item.type === 'text' ? item.text.replace(/\s+/g, ' ').slice(0, 38) : `Screen capture · ${new Date(item.createdAt).toLocaleTimeString()}`}`,
    accelerator: `Control+Alt+${index + 1}`,
    click: () => copyItem(item.id),
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Quick History', accelerator: 'CommandOrControl+Shift+V', click: () => showWindow(true) },
    { label: 'Capture Window', accelerator: 'CommandOrControl+Shift+3', click: captureWindow },
    { label: 'Capture Region', accelerator: 'CommandOrControl+Shift+4', click: captureRegion },
    { label: 'Capture All Screens', accelerator: 'CommandOrControl+Shift+5', click: captureScreen },
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
  globalShortcut.register('CommandOrControl+Shift+3', captureWindow);
  globalShortcut.register('CommandOrControl+Shift+4', captureRegion);
  globalShortcut.register('CommandOrControl+Shift+5', captureScreen);
  for (let index = 0; index < 5; index++) {
    globalShortcut.register(`Control+Alt+${index + 1}`, () => void copyRecent(index));
  }
}

async function writeImageToClipboard(image) {
  if (!image || image.isEmpty()) return false;
  const png = image.toPNG();
  clipboard.clear();
  await clipboard.write([new ClipboardItem({
    'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }),
  })]);
  return clipboard.has('image/png');
}

async function copyItem(id) {
  const item = store.list().items.find((candidate) => candidate.id === id);
  if (!item) return false;
  if (item.type === 'text') {
    clipboard.clear();
    await Promise.resolve(clipboard.writeText(item.text));
    previousClipboardHash = item.hash;
  } else if (item.path) {
    const image = nativeImage.createFromPath(item.path);
    if (!await writeImageToClipboard(image)) return false;
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
    let captured = 0;
    for (const [index, display] of screen.getAllDisplays().entries()) {
      const source = await getScreenSource(display);
      if (!source || source.thumbnail.isEmpty()) continue;
      const item = store.addImage(source.thumbnail.toPNG(), `full-screen capture · display ${index + 1}`);
      if (item && await writeImageToClipboard(source.thumbnail)) previousClipboardHash = item.hash;
      captured += 1;
    }
    if (captured) broadcast();
    return captured;
  } catch { return false; }
}

async function captureWindow() {
  closeWindowPicker();
  mainWindow?.hide();
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: {
        width: Math.max(2400, Math.round(display.size.width * display.scaleFactor)),
        height: Math.max(1600, Math.round(display.size.height * display.scaleFactor)),
      },
      fetchWindowIcons: true,
    });
    const usableSources = sources.filter((source) => !source.thumbnail.isEmpty() && source.name !== 'CloudClip');
    if (!usableSources.length) { showWindow(); return false; }
    windowCaptureSources = new Map(usableSources.map((source) => [source.id, source]));
    windowPicker = new BrowserWindow({
      width: 820, height: 620, minWidth: 560, minHeight: 420,
      title: 'Choose a window', backgroundColor: nativeTheme.shouldUseDarkColors ? '#10151b' : '#f6f5f1',
      titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 }, alwaysOnTop: true,
      webPreferences: { preload: path.join(__dirname, 'window-picker-preload.js'), contextIsolation: true, sandbox: true },
    });
    windowPicker.on('closed', () => {
      windowPicker = null;
      windowCaptureSources.clear();
      showWindow();
    });
    await windowPicker.loadFile(path.join(__dirname, 'window-picker.html'));
    windowPicker.webContents.send('window-capture:sources', usableSources.map((source) => ({
      id: source.id, name: source.name,
      thumbnail: source.thumbnail.resize({ width: 440 }).toDataURL(),
      icon: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.resize({ width: 32, height: 32 }).toDataURL() : null,
    })));
    return true;
  } catch {
    closeWindowPicker();
    showWindow();
    return false;
  }
}

function closeWindowPicker() {
  if (windowPicker && !windowPicker.isDestroyed()) windowPicker.destroy();
  windowPicker = null;
  windowCaptureSources.clear();
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
  ipcMain.handle('storage:open', async () => (await shell.openPath(store.root)) === '');
  ipcMain.handle('settings:update', (_event, settings) => {
    const result = store.updateSettings(settings);
    app.setLoginItemSettings({ openAtLogin: result.launchAtLogin, openAsHidden: true });
    broadcast();
    return result;
  });
  ipcMain.handle('capture:region', captureRegion);
  ipcMain.handle('capture:window', captureWindow);
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
  ipcMain.on('window-capture:cancel', closeWindowPicker);
  ipcMain.on('window-capture:select', async (_event, id) => {
    const source = windowCaptureSources.get(id);
    if (!source || source.thumbnail.isEmpty()) return;
    const item = store.addImage(source.thumbnail.toPNG(), 'window capture');
    if (item && await writeImageToClipboard(source.thumbnail)) previousClipboardHash = item.hash;
    broadcast();
    closeWindowPicker();
  });
  ipcMain.on('capture:complete', async (event, selection) => {
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
    if (!result.isEmpty()) {
      const item = store.addImage(result.toPNG(), 'region capture');
      if (item && await writeImageToClipboard(result)) previousClipboardHash = item.hash;
      broadcast();
      showWindow();
    }
  });
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Clip', submenu: [
      { label: 'Open Quick History', accelerator: 'CommandOrControl+Shift+V', click: () => showWindow(true) },
      { type: 'separator' },
      { label: 'Capture Window', accelerator: 'CommandOrControl+Shift+3', click: captureWindow },
      { label: 'Capture Region', accelerator: 'CommandOrControl+Shift+4', click: captureRegion },
      { label: 'Capture All Screens', accelerator: 'CommandOrControl+Shift+5', click: captureScreen },
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
app.on('before-quit', () => { app.isQuitting = true; clearInterval(pollTimer); globalShortcut.unregisterAll(); closeOverlays(); closeWindowPicker(); });
app.on('window-all-closed', () => { /* menu-bar utility remains available */ });
