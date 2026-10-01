// Wow and Flutter: the Electron shell. Opens full screen (its own Space on the
// Mac, so you can swipe to it and away), keeps itself current from GitHub
// releases the way NEO does, and hands a few facts to the page.
const { app, BrowserWindow, Menu, ipcMain, shell, clipboard } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const previewBuild = require('./package.json').wfPreview === true;
if (!app.isPackaged || previewBuild) app.setPath('userData', process.env.WF_DEV_DATA || path.join(app.getPath('appData'), 'Wow and Flutter Record Shop Preview'));
const { ShopService } = require('./shop/service');
let shop;
const shopService = () => shop ||= new ShopService({ file: path.join(app.getPath('userData'), 'record-shop.json'), apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-5-mini' });
function trustedShop(event) {
  if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Invalid shop sender.');
}
for (const [channel, handler] of Object.entries({
  'wf:shop-state': () => shopService().snapshot(),
  'wf:shop-action': req => shopService().action(req),
  'wf:shop-chat': req => shopService().chat(req),
  'wf:shop-cancel': () => shopService().cancel()
})) ipcMain.handle(channel, async (event, req) => {
  trustedShop(event);
  try { return { ok: true, value: await handler(req) }; } catch (e) { return { ok: false, error: /ENOENT|EACCES|ENOSPC/.test(e.message) ? 'Local shop storage is unavailable. Check disk access.' : e.message }; }
});

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
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\/open\.spotify\.com\/search\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
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
  if (updater || !app.isPackaged || previewBuild) return updater;
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


// ---- saved game: wallet, rack, play counts (a small JSON file in the user's data folder)
const saveFile = () => path.join(app.getPath('userData'), 'save.json');
ipcMain.handle('wf:load-save', () => { try { return JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch { return null; } });
ipcMain.handle('wf:write-save', (_e, obj) => {
  try { const tmp = saveFile() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj)); fs.renameSync(tmp, saveFile()); return true; } catch { return false; }
});

// ---- the Spotify app on this Mac, driven with AppleScript (no web login needed to play)
const D = '|||';
const STATE_SCRIPT = `
if application "Spotify" is running then
  tell application "Spotify"
    set st to (player state as string)
    if st is "stopped" then return "stopped"
    set t to current track
    set art to ""
    try
      set art to artwork url of t
    end try
    set d to "${D}"
    return st & d & (name of t) & d & (artist of t) & d & (album of t) & d & ((duration of t) as string) & d & ((player position) as string) & d & (spotify url of t) & d & ((track number of t) as string) & d & art
  end tell
else
  return "notrunning"
end if`;
function osa(script, timeout = 5000) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', ['-e', script], { timeout }, (err, out, errout) => err ? reject(new Error((errout || err.message).trim())) : resolve(String(out).trim()));
  });
}
const num = (s) => Number(String(s).replace(',', '.')) || 0;
ipcMain.handle('wf:spotify', async (_e, cmd, arg) => {
  if (process.platform !== 'darwin') return { error: 'The Spotify bridge only works on a Mac.' };
  try {
    switch (cmd) {
      case 'state': {
        const out = await osa(STATE_SCRIPT);
        if (out === 'notrunning' || out === 'stopped') return { state: out };
        const [state, title, artist, album, dur, pos, uri, trackNo, art] = out.split(D);
        return { state, title, artist, album, durMs: num(dur), pos: num(pos), uri, trackNo: num(trackNo), art: art || '' };
      }
      case 'playpause': await osa('tell application "Spotify" to playpause'); return { ok: true };
      case 'pause': await osa('tell application "Spotify" to pause'); return { ok: true };
      case 'next': await osa('tell application "Spotify" to next track'); return { ok: true };
      case 'previous': await osa('tell application "Spotify" to previous track'); return { ok: true };
      case 'seek': await osa(`tell application "Spotify" to set player position to ${num(arg)}`); return { ok: true };
      case 'play': {
        if (arg == null) {
          await osa('if application "Spotify" is not running then\n tell application "Spotify" to launch\n delay 3\nend if\ntell application "Spotify" to play', 12000);
          return { ok: true };
        }
        if (!/^spotify:(track|album|playlist|artist):[A-Za-z0-9]+$/.test(String(arg))) return { error: 'Not a Spotify link.' };
        await osa(`tell application "Spotify" to play track "${arg}"`); return { ok: true };
      }
      case 'connect': {   // opens Spotify if needed and says hello to it, which is what makes macOS ask for permission
        await osa('tell application "Spotify" to launch', 10000);
        await osa('tell application "Spotify" to get player state as string', 10000);
        return { ok: true };
      }
      case 'volume': {
        const v = Math.max(0, Math.min(100, Math.round(num(arg))));
        await osa(`tell application "Spotify" to set sound volume to ${v}`); return { ok: true };
      }
      case 'station': {   // tune in like a radio: shuffled, and already in the middle of a song
        if (!/^spotify:(playlist|album|artist):[A-Za-z0-9]+$/.test(String(arg))) return { error: 'Not a Spotify playlist, album or artist link.' };
        await osa(`if application "Spotify" is not running then
  tell application "Spotify" to launch
  delay 3
end if
tell application "Spotify"
  set shuffling to true
  play track "${arg}"
  delay 1.5
  try
    next track
    delay 1.2
  end try
  try
    set d to (duration of current track) / 1000
    set player position to d * (0.12 + ((random number from 0 to 60) / 100))
  end try
end tell`, 20000);
        return { ok: true };
      }
      case 'clipboard': return { text: clipboard.readText() };
      case 'oembed': {
        try {
          const r = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(String(arg)));
          const j = await r.json(); return { title: j.title || '' };
        } catch (e) { return { title: '' }; }
      }
      default: return { error: 'Unknown command.' };
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (/not allowed|-1743/.test(msg)) return { error: 'permission', detail: 'Allow Wow and Flutter to control Spotify in System Settings > Privacy & Security > Automation.' };
    return { error: msg };
  }
});

app.whenReady().then(() => {
  buildMenu(); createWindow();
  setTimeout(() => lookForUpdate().catch(() => {}), 5000);
  setInterval(() => lookForUpdate().catch(() => {}), 4 * 60 * 60 * 1000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
