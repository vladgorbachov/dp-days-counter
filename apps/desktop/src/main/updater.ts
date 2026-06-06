import { BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import {
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_EVENT_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_INSTALL_CHANNEL,
  UpdateState
} from './shared-types';

/**
 * Wraps electron-updater so the renderer can drive auto-updates over IPC.
 *
 * Behaviour summary (chosen to match the agreed UX: prompt before install):
 *   - Auto-download is OFF; the renderer asks the user before pulling bytes.
 *   - Install never happens silently; the user explicitly clicks "Install".
 *   - Every state change is broadcast on `UPDATE_EVENT_CHANNEL` so the UI
 *     can render progress, errors, and the "ready to install" prompt.
 */
export class UpdaterService {
  private currentState: UpdateState = { status: 'idle' };
  private mainWindowProvider: () => BrowserWindow | null;

  constructor(mainWindowProvider: () => BrowserWindow | null) {
    this.mainWindowProvider = mainWindowProvider;

    autoUpdater.logger = log;
    log.transports.file.level = 'info';
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    this.bindUpdaterEvents();
    this.bindIpc();
  }

  /** Trigger an initial check shortly after the window is ready. */
  public scheduleStartupCheck(delayMs = 5000): void {
    setTimeout(() => {
      this.check().catch((err) => log.error('Startup update check failed:', err));
    }, delayMs);
  }

  private bindUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.setState({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      this.setState({
        status: 'available',
        version: info.version,
        releaseNotes: this.normalizeReleaseNotes(info.releaseNotes),
        releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : undefined
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.setState({ status: 'not-available', version: info.version });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.setState({
        status: 'downloading',
        progressPercent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.setState({
        status: 'downloaded',
        version: info.version,
        releaseNotes: this.normalizeReleaseNotes(info.releaseNotes),
        releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : undefined
      });
    });

    autoUpdater.on('error', (error) => {
      this.setState({
        status: 'error',
        errorMessage: error?.message ?? String(error)
      });
    });
  }

  private bindIpc(): void {
    ipcMain.handle(UPDATE_CHECK_CHANNEL, async () => {
      await this.check();
      return this.currentState;
    });

    ipcMain.handle(UPDATE_DOWNLOAD_CHANNEL, async () => {
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        log.error('downloadUpdate failed:', error);
        this.setState({
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
      return this.currentState;
    });

    ipcMain.handle(UPDATE_INSTALL_CHANNEL, () => {
      // isSilent=false, isForceRunAfter=true matches the NSIS upgrade flow:
      // user sees the installer briefly, then app relaunches with the new build.
      autoUpdater.quitAndInstall(false, true);
      return true;
    });

    ipcMain.handle(UPDATE_GET_STATE_CHANNEL, () => this.currentState);
  }

  private async check(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('checkForUpdates failed:', error);
      this.setState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private setState(partial: Partial<UpdateState>): void {
    this.currentState = { ...this.currentState, ...partial };
    const win = this.mainWindowProvider();
    if (win && !win.isDestroyed()) {
      win.webContents.send(UPDATE_EVENT_CHANNEL, this.currentState);
    }
  }

  private normalizeReleaseNotes(notes: unknown): string | undefined {
    if (typeof notes === 'string') return notes;
    if (Array.isArray(notes)) {
      return notes
        .map((entry) => (typeof entry === 'string' ? entry : entry?.note ?? ''))
        .filter(Boolean)
        .join('\n');
    }
    return undefined;
  }
}
