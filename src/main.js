const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const updateModule = require('../update.js');
const { AUTO_UPDATE_CONFIG } = require('./config/auto-update.js');
const userPreferences = require('./config/user-preferences.js');

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
app.whenReady().then(() => {
  createWindow();
  
  // Start auto-update system
  if (AUTO_UPDATE_CONFIG.CHECK_ON_STARTUP) {
    setTimeout(() => {
      checkForUpdatesSilently();
    }, AUTO_UPDATE_CONFIG.STARTUP_DELAY);
  }
  
  // Set up periodic update checks
  setInterval(() => {
    if (userPreferences.shouldCheckForUpdates()) {
      checkForUpdatesSilently();
    }
  }, AUTO_UPDATE_CONFIG.PERIODIC_CHECK_INTERVAL);
});

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

// Auto-update functions
async function checkForUpdatesSilently() {
  try {
    // Update last check time
    userPreferences.updateLastCheckTime();
    
    const update = await updateModule.checkForUpdates();
    
    if (update) {
      // Check if user has skipped this version
      if (userPreferences.isVersionSkipped(update.version)) {
        return;
      }
      
      // Check user preferences for notifications
      const preferences = userPreferences.loadUserPreferences();
      if (!preferences.notificationEnabled) {
        return;
      }
      
      // Show notification to user
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${update.version}) is available!`,
        detail: 'Would you like to download and install the update now?',
        buttons: ['Yes', 'Later', 'Skip This Version', 'View Details'],
        defaultId: 0,
        cancelId: 1
      });
      
      switch (result.response) {
        case 0: // Yes
          updateModule.createUpdateWindow();
          break;
        case 2: // Skip This Version
          userPreferences.skipVersion(update.version);
          break;
        case 3: // View Details
          require('electron').shell.openExternal(`https://github.com/delion-software/dp-days-counter/releases`);
          break;
        // Case 1 (Later) - do nothing
      }
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Manual update check handler
ipcMain.handle('check-updates-manual', async () => {
  try {
    const update = await updateModule.checkForUpdates();
    return update;
  } catch (error) {
    console.error('Error checking for updates manually:', error);
    return null;
  }
});

// User preferences handlers
ipcMain.handle('get-update-preferences', () => {
  return userPreferences.loadUserPreferences();
});

ipcMain.handle('update-preference', async (event, key, value) => {
  return userPreferences.updatePreference(key, value);
});

ipcMain.handle('skip-version', async (event, version) => {
  userPreferences.skipVersion(version);
});

ipcMain.handle('unskip-version', async (event, version) => {
  userPreferences.unskipVersion(version);
}); 