const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
app.whenReady().then(() => {
  createWindow();
  
  // Start auto-update system
  setTimeout(() => {
    checkForUpdatesSilently();
  }, 5000); // Check after 5 seconds
  
  // Set up periodic update checks (every 24 hours)
  setInterval(() => {
    checkForUpdatesSilently();
  }, 24 * 60 * 60 * 1000);
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
    const update = await updateModule.checkForUpdates();
    
    if (update) {
      // Show notification to user
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${update.version}) is available!`,
        detail: 'Would you like to download and install the update now?',
        buttons: ['Yes', 'Later', 'View Details'],
        defaultId: 0,
        cancelId: 1
      });
      
      switch (result.response) {
        case 0: // Yes
          ipcRenderer.invoke('check-updates-manual');
          break;
        case 2: // View Details
          require('electron').shell.openExternal(`https://github.com/REAL_USERNAME/dp-days-counter/releases`);
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
    if (update) {
      const action = await updateModule.showUpdateDialog(update);
      if (action === 'install') {
        await updateModule.showDownloadProgress();
        const installerPath = await updateModule.downloadUpdate(update.downloadUrl, (progress) => {
          // Progress will be handled by the dialog
        });
        await updateModule.installUpdate(installerPath);
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Complete',
          message: 'Update has been installed successfully. The application will restart.',
          buttons: ['OK']
        });
        app.relaunch();
        app.exit();
      }
    } else {
      dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You are using the latest version!',
        buttons: ['OK']
      });
    }
    return update;
  } catch (error) {
    dialog.showErrorBox('Update Error', error.message);
    return null;
  }
}); 