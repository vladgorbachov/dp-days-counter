const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const updateModule = require('../update.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1380,
    minHeight: 920,
    maxWidth: 1380,
    maxHeight: 920,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    backgroundColor: '#2f3241',
    show: false,
    icon: path.join(__dirname, 'assets/logo.png') // Make sure to place your logo.png file in the assets directory
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('app-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('app-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('app-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// DP Hours storage
const dpHoursFile = path.join(app.getPath('userData'), 'dp-hours.json');

ipcMain.handle('get-dp-hours', async () => {
  try {
    if (fs.existsSync(dpHoursFile)) {
      const data = fs.readFileSync(dpHoursFile, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading DP hours:', error);
    return {};
  }
});

ipcMain.handle('save-dp-hours', async (event, dpHours) => {
  try {
    fs.writeFileSync(dpHoursFile, JSON.stringify(dpHours, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving DP hours:', error);
    return { success: false, error: error.message };
  }
});

// App Settings storage
const appSettingsFile = path.join(app.getPath('userData'), 'app-settings.json');

ipcMain.handle('get-app-settings', async () => {
  try {
    if (fs.existsSync(appSettingsFile)) {
      const data = fs.readFileSync(appSettingsFile, 'utf8');
      return JSON.parse(data);
    }
    return {
      theme: 'dark'
    };
  } catch (error) {
    console.error('Error reading app settings:', error);
    return {
      theme: 'dark'
    };
  }
});

ipcMain.handle('save-app-settings', async (event, settings) => {
  try {
    fs.writeFileSync(appSettingsFile, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving app settings:', error);
    return { success: false, error: error.message };
  }
});

// Update window handler
ipcMain.handle('open-update-window', () => {
  updateModule.createUpdateWindow();
}); 