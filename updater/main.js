const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const os = require('os');

let mainWindow;
let updateInfo = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'DP Days Counter - Updater'
  });

  mainWindow.loadFile(path.join(__dirname, 'updater.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  updateInfo = {
    downloadUrl: args[0],
    version: args[1] || 'Unknown',
    releaseNotes: args[2] || ''
  };
}

// IPC handlers
ipcMain.handle('get-update-info', () => {
  return updateInfo;
});

ipcMain.handle('download-update', async (event, downloadUrl) => {
  try {
    const installerPath = await downloadUpdate(downloadUrl, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });
    
    return installerPath;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('install-update', async (event, installerPath) => {
  try {
    await installUpdate(installerPath);
    return true;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('close-updater', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// Download update function
function downloadUpdate(downloadUrl, progressCallback) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(os.tmpdir(), 'dp-days-counter-update');
    const installerPath = path.join(tempDir, 'DP-Days-Counter-Update.exe');
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const file = fs.createWriteStream(installerPath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    
    const request = https.get(downloadUrl, (response) => {
      totalBytes = parseInt(response.headers['content-length'], 10);
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
        progressCallback(progress);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(installerPath);
      });
    });
    
    request.on('error', (error) => {
      fs.unlink(installerPath, () => {}); // Delete file on error
      reject(error);
    });
    
    file.on('error', (error) => {
      fs.unlink(installerPath, () => {}); // Delete file on error
      reject(error);
    });
  });
}

// Install update function
function installUpdate(installerPath) {
  return new Promise((resolve, reject) => {
    // Run the update installer silently
    exec(`"${installerPath}" /SILENT /CLOSEAPPLICATIONS`, (error) => {
      if (error) {
        reject(error);
      } else {
        // Close the updater after successful installation
        setTimeout(() => {
          app.quit();
        }, 2000);
        resolve();
      }
    });
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 