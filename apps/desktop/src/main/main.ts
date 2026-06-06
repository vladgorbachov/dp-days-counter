import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import {
  AppSettings,
  DPDays,
  WINDOW_STATE_CHANNEL,
  isValidDpDays,
  isValidSettings
} from './shared-types';
import { UpdaterService } from './updater';

// File logger: writes to %APPDATA%\DP Days Counter\logs\main.log on Windows.
// Useful for diagnosing first-run issues that users can email back to us.
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info(`Starting DP Days Counter ${app.getVersion()} on ${process.platform}`);

let mainWindow: BrowserWindow | null = null;
let updater: UpdaterService | null = null;

const userDataPath = app.getPath('userData');
const dpDaysFile = path.join(userDataPath, 'dp_days.json');
const settingsFile = path.join(userDataPath, 'settings.json');

/** Background colour used everywhere to prevent paint flashes during navigation. */
const BACKGROUND_COLOR = '#0a0a0a';

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

/**
 * Read a JSON file with a typed validator. On any error or invalid payload
 * returns the supplied fallback so corrupted state cannot crash the app.
 */
function readJsonSafe<T>(filePath: string, validate: (value: unknown) => value is T, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

/** Atomic-ish write: write to a temp file then rename, to avoid half-written JSON. */
function writeJsonSafe(filePath: string, data: unknown): boolean {
  try {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (error) {
    console.error(`Failed to write ${filePath}:`, error);
    return false;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'DP Days Counter',
    backgroundColor: BACKGROUND_COLOR,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
    },
    icon: path.join(__dirname, '../assets/logo.ico'),
    show: false
  });

  const loadingPath = path.join(__dirname, '../renderer/loading.html');
  log.info(`Loading splash from ${loadingPath}`);
  mainWindow.loadFile(loadingPath).catch((err) => log.error('loadFile splash failed:', err));

  // Single show, exactly when first paint is ready: no white flash, no double show.
  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready-to-show');
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log.error(`did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  const broadcastWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(WINDOW_STATE_CHANNEL, {
      isMaximized: mainWindow.isMaximized()
    });
  };

  mainWindow.on('maximize', broadcastWindowState);
  mainWindow.on('unmaximize', broadcastWindowState);
  mainWindow.webContents.on('did-finish-load', () => {
    log.info(`did-finish-load url=${mainWindow?.webContents.getURL()}`);
    // Sync the maximize button icon with the initial window state.
    broadcastWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open every external link in the OS browser, never spawn a new Electron window.
    shell.openExternal(url).catch((err) => console.error('openExternal failed:', err));
    return { action: 'deny' };
  });

  updater = new UpdaterService(() => mainWindow);
  updater.scheduleStartupCheck();
}

ipcMain.handle('load-dp-days', async (): Promise<DPDays> => {
  return readJsonSafe<DPDays>(dpDaysFile, isValidDpDays, {});
});

ipcMain.handle('save-dp-days', async (_event, data: unknown): Promise<boolean> => {
  if (!isValidDpDays(data)) {
    console.error('save-dp-days received invalid payload');
    return false;
  }
  return writeJsonSafe(dpDaysFile, data);
});

ipcMain.handle('load-settings', async (): Promise<AppSettings> => {
  return readJsonSafe<AppSettings>(settingsFile, isValidSettings, { theme: 'dark' });
});

ipcMain.handle('save-settings', async (_event, data: unknown): Promise<boolean> => {
  if (!isValidSettings(data)) {
    console.error('save-settings received invalid payload');
    return false;
  }
  return writeJsonSafe(settingsFile, data);
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('open-external', async (_event, url: unknown): Promise<boolean> => {
  if (typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Whitelist: http(s) only. Prevents launching arbitrary protocols (file:, mailto:, etc.)
  // through a renderer-controlled string.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  try {
    await shell.openExternal(parsed.toString());
    return true;
  } catch (error) {
    console.error('openExternal failed:', error);
    return false;
  }
});

ipcMain.handle('app-version', () => app.getVersion());

// Legacy compatibility: older builds of loading.html relied on this IPC channel
// to navigate to the main window. New builds navigate via `location.replace`,
// so this handler is now a no-op kept only to keep older renderers working.
ipcMain.handle('loading-complete', async () => {
  if (!mainWindow) return;
  try {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } catch (error) {
    log.error('Error loading main application via legacy IPC:', error);
  }
});

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

// Hard-block any in-app navigation that escapes the file:// scheme.
// NOTE: a file:// URL has `origin === "null"` (a literal string), not "file://",
// so we compare on `protocol` instead — the previous version blocked legitimate
// in-app navigation between bundled HTML pages.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
        log.warn(`Blocked navigation to non-file URL: ${navigationUrl}`);
      }
    } catch (error) {
      event.preventDefault();
      log.warn(`Blocked invalid navigation URL: ${navigationUrl}`, error);
    }
  });
});
