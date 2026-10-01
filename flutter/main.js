// Wow and Flutter: the Electron shell. Opens full screen (its own Space on the
// Mac, so you can swipe to it and away), keeps itself current from GitHub
// releases the way NEO does, and hands a few facts to the page.
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const stateFile = () => path.join(app.getPath('userData'), 'window.json');
function loadState() { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; } }
function saveState(s) { try { fs.writeFileSync(stateFile(), JSON.stringify(s)); } catch {} }

let win = null;
function sendToWindow(msg) { if (win && !win.isDestroyed()) win.webContents.send('wf:update', msg); }

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1440, height: st.height || 900,
    minWidth: 900, minHeight: 600,
    fullscreen: st.fullscreen !== false,        // full screen unless you left it windowed
    backgroundColor: '#0b0708',
    title: 'W&F',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  const remember = () => {
    const b = win.getNormalBounds ? win.getNormalBounds() : win.getBounds();
    saveState({ width: b.width, height: b.height, fullscreen: win.isFullScreen() });
  };
  win.on('enter-full-screen', remember); win.on('leave-full-screen', remember); win.on('close', remember);
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const t = [
    { label: app.name, submenu: [
      { role: 'about' }, { type: 'separator' },
      { label: 'Check for Update…', click: () => lookForUpdate().catch(() => {}) },
      { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' } ] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'reload' }, { role: 'toggleDevTools' }] },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

// Updating, as in NEO: a few seconds after launch and every four hours after
// that, look at the latest GitHub release. If it is newer, download it quietly;
// it installs when the app quits, or when you press Restart in the page.
let updater = null, updaterReady = false;
const upd = { state: 'idle', version: '', percent: 0, message: '' };
function getUpdater() {
  if (updater || !app.isPackaged) return updater;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => { Object.assign(upd, { state: 'downloading', version: (i && i.version) || '', percent: 0 }); sendToWindow({ ...upd }); });
  autoUpdater.on('download-progress', (p) => { Object.assign(upd, { state: 'downloading', percent: p.percent }); sendToWindow({ ...upd }); });
  autoUpdater.on('update-downloaded', (i) => { updaterReady = true; Object.assign(upd, { state: 'ready', percent: 100, version: (i && i.version) || upd.version }); sendToWindow({ ...upd }); });
  autoUpdater.on('error', (e) => { if (updaterReady) return; Object.assign(upd, { state: 'error', message: String((e && e.message) || e) }); sendToWindow({ ...upd }); });
  updater = autoUpdater;
  return updater;
}
let look = null;
function lookForUpdate() {
  const u = getUpdater();
  if (!u) return Promise.resolve(null);
  if (updaterReady || upd.state === 'downloading') return Promise.resolve(null);
  if (!look) look = u.checkForUpdates().finally(() => { look = null; });
  return look;
}

ipcMain.handle('wf:version', () => app.getVersion());
ipcMain.handle('wf:update-state', () => ({ ...upd }));
ipcMain.handle('wf:install-update', () => { if (updaterReady && updater) updater.quitAndInstall(); });

app.whenReady().then(() => {
  buildMenu(); createWindow();
  setTimeout(() => lookForUpdate().catch(() => {}), 5000);
  setInterval(() => lookForUpdate().catch(() => {}), 4 * 60 * 60 * 1000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
