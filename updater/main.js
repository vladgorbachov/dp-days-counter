const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false,
    icon: path.join(__dirname, '../src/assets/logo.png'),
    title: 'DP Hours Counter - Updater'
  });

  mainWindow.loadFile(path.join(__dirname, 'updater.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers
ipcMain.handle('close-updater', () => {
  app.quit();
});

ipcMain.handle('install-update', async (event, installerPath) => {
  try {
    // Проверяем, что файл установщика существует
    if (!fs.existsSync(installerPath)) {
      throw new Error('Installer file not found');
    }

    // Запускаем установщик с параметрами
    exec(`"${installerPath}" /SILENT /CLOSEAPPLICATIONS /NORESTART`, (error) => {
      if (error) {
        console.error('Error installing update:', error);
        mainWindow.webContents.send('install-error', error.message);
      } else {
        // Успешная установка
        mainWindow.webContents.send('install-success');
        
        // Закрываем приложение через 3 секунды
        setTimeout(() => {
          app.quit();
        }, 3000);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in install-update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-installer', async (event, installerPath) => {
  try {
    const exists = fs.existsSync(installerPath);
    const stats = exists ? fs.statSync(installerPath) : null;
    
    return {
      exists,
      size: exists ? stats.size : 0,
      path: installerPath
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
});

// Обработка аргументов командной строки
const args = process.argv.slice(2);
let installerPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--installer' && i + 1 < args.length) {
    installerPath = args[i + 1];
    break;
  }
}

// Передаем путь к установщику в рендерер
ipcMain.handle('get-installer-path', () => {
  return installerPath;
}); 