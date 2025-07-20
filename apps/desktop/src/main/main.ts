import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Data storage paths
const userDataPath = app.getPath('userData');
const dpDaysFile = path.join(userDataPath, 'dp_days.json');
const settingsFile = path.join(userDataPath, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    minWidth: 1200,
    minHeight: 800,
    frame: false, // Remove default window frame
    titleBarStyle: 'hidden',
    title: 'DP Days Counter',
    backgroundColor: '#0f172a', // Dark theme background color
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/logo.ico'),
    show: false // Don't show until ready
  });

  // Load and show loading screen immediately
  mainWindow.loadFile(path.join(__dirname, '../renderer/loading.html'));
  
  // Show window immediately when loading screen is ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// IPC Handlers for data management
ipcMain.handle('load-dp-days', async () => {
  try {
    if (fs.existsSync(dpDaysFile)) {
      const data = fs.readFileSync(dpDaysFile, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading DP days:', error);
    return {};
  }
});

ipcMain.handle('save-dp-days', async (event, data: Record<string, number>) => {
  try {
    fs.writeFileSync(dpDaysFile, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving DP days:', error);
    return false;
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      return JSON.parse(data);
    }
    return { theme: 'dark' };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { theme: 'dark' };
  }
});

ipcMain.handle('save-settings', async (event, data: any) => {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
});

// Window control handlers
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// External link handler
ipcMain.handle('open-external', async (event, url: string) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('Error opening external URL:', error);
    return false;
  }
});

// Loading completion handler
ipcMain.handle('loading-complete', async () => {
  if (mainWindow) {
    try {
      // Load the main application
      await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      
      // Set initial theme
      await mainWindow.webContents.executeJavaScript(`
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.opacity = '1';
      `);
      
      // Show the main window
      mainWindow.show();
    } catch (error) {
      console.error('Error loading main application:', error);
    }
  }
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow navigation to our own files
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}); 