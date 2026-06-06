import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import {
  AppSettings,
  DPDays,
  WINDOW_STATE_CHANNEL,
  isValidDpDays,
  isValidSettings,
  sanitizeDpDays
} from './shared-types';
import { getUpdaterService } from './updater';

log.transports.file.level = 'info';
log.transports.console.level = 'info';

let mainWindow: BrowserWindow | null = null;
let dpDaysFile = '';
let settingsFile = '';

/** Background colour used everywhere to prevent paint flashes during navigation. */
const BACKGROUND_COLOR = '#0a0a0a';

/** Minimum window size tuned for 1366×768 laptops on Windows 10/11. */
const MIN_WINDOW_WIDTH = 1024;
const MIN_WINDOW_HEIGHT = 640;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function initStoragePaths(): void {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  dpDaysFile = path.join(userDataPath, 'dp_days.json');
  settingsFile = path.join(userDataPath, 'settings.json');

  const logsDir = path.join(userDataPath, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logFile = path.join(logsDir, 'main.log');
  log.transports.file.resolvePathFn = () => logFile;

  log.info(`User data directory: ${userDataPath}`);
  log.info(`Log file: ${logFile}`);
}

function isTrustedRenderer(event: IpcMainInvokeEvent): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return event.sender.id === mainWindow.webContents.id;
}

/** Whitelist http(s) URLs before handing them to the OS shell. */
function openHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  shell.openExternal(parsed.toString()).catch((err) => log.error('openExternal failed:', err));
  return true;
}

/**
 * Load DP days with per-key sanitization so one corrupt entry cannot wipe years of data.
 * Automatically repairs the on-disk file when invalid keys are stripped.
 */
function loadDpDays(): DPDays {
  try {
    if (!fs.existsSync(dpDaysFile)) return {};
    const raw = fs.readFileSync(dpDaysFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (isValidDpDays(parsed)) return parsed;

    const sanitized = sanitizeDpDays(parsed);
    log.warn('Repaired invalid entries in dp_days.json');
    writeJsonSafe(dpDaysFile, sanitized);
    return sanitized;
  } catch (error) {
    log.error('Failed to load dp_days.json:', error);
    return {};
  }
}

function readJsonSafe<T>(
  filePath: string,
  validate: (value: unknown) => value is T,
  fallback: T
): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch (error) {
    log.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

/** Atomic-ish write: temp file + rename avoids half-written JSON on crash. */
function writeJsonSafe(filePath: string, data: unknown): boolean {
  try {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (error) {
    log.error(`Failed to write ${filePath}:`, error);
    return false;
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'DP Days Counter',
    backgroundColor: BACKGROUND_COLOR,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true
    },
    icon: path.join(__dirname, '../assets/logo.ico'),
    show: false
  });

  const loadingPath = path.join(__dirname, '../renderer/loading.html');
  log.info(`Loading splash from ${loadingPath}`);
  mainWindow.loadFile(loadingPath).catch((err) => log.error('loadFile splash failed:', err));

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
    broadcastWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openHttpUrl(url);
    return { action: 'deny' };
  });

  getUpdaterService(() => mainWindow, settingsFile).scheduleStartupCheck();
}

ipcMain.handle('load-dp-days', async (): Promise<DPDays> => loadDpDays());

ipcMain.handle('save-dp-days', async (event, data: unknown): Promise<boolean> => {
  if (!isTrustedRenderer(event)) return false;
  if (!isValidDpDays(data)) {
    log.error('save-dp-days received invalid payload');
    return false;
  }
  return writeJsonSafe(dpDaysFile, data);
});

ipcMain.handle('load-settings', async (): Promise<AppSettings> => {
  return readJsonSafe<AppSettings>(settingsFile, isValidSettings, { theme: 'dark' });
});

ipcMain.handle('save-settings', async (event, data: unknown): Promise<boolean> => {
  if (!isTrustedRenderer(event)) return false;
  if (!isValidSettings(data)) {
    log.error('save-settings received invalid payload');
    return false;
  }
  return writeJsonSafe(settingsFile, data);
});

ipcMain.handle('minimize-window', (event) => {
  if (!isTrustedRenderer(event)) return;
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', (event) => {
  if (!isTrustedRenderer(event)) return;
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', (event) => {
  if (!isTrustedRenderer(event)) return;
  mainWindow?.close();
});

ipcMain.handle('is-maximized', (event) => {
  if (!isTrustedRenderer(event)) return false;
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('open-external', async (event, url: unknown): Promise<boolean> => {
  if (!isTrustedRenderer(event)) return false;
  if (typeof url !== 'string') return false;
  return openHttpUrl(url);
});

ipcMain.handle('app-version', () => app.getVersion());

/** Legacy fallback if an old loading.html still calls this IPC channel. */
ipcMain.handle('loading-complete', async (event) => {
  if (!isTrustedRenderer(event) || !mainWindow) return;
  try {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } catch (error) {
    log.error('Error loading main application via legacy IPC:', error);
  }
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  log.info(`Starting DP Days Counter ${app.getVersion()} on ${process.platform}`);
  initStoragePaths();
  getUpdaterService(() => mainWindow, settingsFile);
  createWindow();
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
