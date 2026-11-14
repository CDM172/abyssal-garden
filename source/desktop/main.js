// Desktop wrapper: opens the single-file game (index.html) in its own window.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

// laptops with two graphics cards: use the fast one
app.commandLine.appendSwitch('force_high_performance_gpu');
// Linux builds of Chromium keep WebGPU behind a flag
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-features', 'Vulkan');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

const external = (url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); };

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1600, height: 900, show: false, backgroundColor: '#000000', title: 'Abyssal Garden',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.maximize();
  win.show();

  // F11 or Alt+Enter: fullscreen. Ctrl+Q: quit. (Esc belongs to the game: it opens the menu.)
  win.webContents.on('before-input-event', (e, k) => {
    if (k.type !== 'keyDown') return;
    if (k.key === 'F11' || (k.alt && k.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (k.control && k.key.toLowerCase() === 'q') app.quit();
  });
  // the GitHub / Ko-fi links open in the normal browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); external(url); } });

  win.loadFile(path.join(__dirname, 'index.html'));
});

app.on('window-all-closed', () => app.quit());
