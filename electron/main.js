const { app, BrowserWindow, Tray, Menu, screen } = require('electron');
const path = require('path');

let mainWindow;
let tray;

// Helper to check if we are in development or production
const isDev = !app.isPackaged;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,           // No title bar or borders
    fullscreen: true,       // Takes over the screen
    transparent: false,
    skipTaskbar: true,      // Don't show in taskbar (Wallpaper behavior)
    type: 'desktop',        // OS hint for desktop level
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple local storage access
      webSecurity: false       // Allows loading local images if needed
    }
  });

  if (isDev) {
    // In Dev: Load the Vite server
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    mainWindow.loadURL(startUrl);
    // mainWindow.webContents.openDevTools(); // Uncomment to debug in dev
  } else {
    // In Production: Load the compiled index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Prevent closing when user hits Alt+F4 to ensure it stays as wallpaper
  mainWindow.on('close', (e) => {
    // Only quit if we explicitly ask via Tray
    if (!app.isQuitting) {
      e.preventDefault();
    }
  });
}

function createTray() {
  // Path adjustment for dev vs prod
  const iconPath = isDev 
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(process.resourcesPath, 'public/tray-icon.png'); 

  // Fallback if icon missing, though builder should bundle it if configured
  try {
    tray = new Tray(iconPath); 
  } catch (e) {
    // If tray icon fails, we just don't have a tray, but app runs.
    console.log("Tray icon error", e);
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Wall-Schedule', click: () => mainWindow.show() },
    { label: 'Hide', click: () => mainWindow.hide() },
    { type: 'separator' },
    { label: 'Quit Wall-Schedule', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setToolTip('Wall-Schedule Active');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  try { createTray(); } catch (e) { console.log("Tray error"); }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});