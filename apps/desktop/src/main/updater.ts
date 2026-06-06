import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import * as fs from 'fs';
import {
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_EVENT_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_INSTALL_CHANNEL,
  UpdateState,
  isValidSettings,
  shouldAutoCheckForUpdates
} from './shared-types';

/**
 * Wraps electron-updater so the renderer can drive auto-updates over IPC.
 *
 * UX contract:
 *   - Download only after the user confirms in Settings.
 *   - "Install & Restart" applies immediately.
 *   - "On Next Quit" relies on autoInstallOnAppQuit (silent install on exit).
 *   - Background startup checks log failures but never surface raw HTTP dumps in UI.
 */
export class UpdaterService {
  private static ipcRegistered = false;

  private currentState: UpdateState = { status: 'idle' };
  private mainWindowProvider: () => BrowserWindow | null;
  private settingsFilePath: string;
  private lastCheckWasManual = false;

  constructor(mainWindowProvider: () => BrowserWindow | null, settingsFilePath: string) {
    this.mainWindowProvider = mainWindowProvider;
    this.settingsFilePath = settingsFilePath;

    autoUpdater.logger = log;
    log.transports.file.level = 'info';
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    this.bindUpdaterEvents();
    this.registerIpcOnce();
  }

  /** Trigger an initial check after startup if the weekly interval has elapsed. */
  public scheduleStartupCheck(delayMs = 5000): void {
    setTimeout(() => {
      if (!this.isStartupCheckDue()) {
        log.info('Startup update check skipped (checked recently)');
        return;
      }
      this.check(false).catch((err) => log.error('Startup update check failed:', err));
    }, delayMs);
  }

  private isStartupCheckDue(): boolean {
    try {
      if (!fs.existsSync(this.settingsFilePath)) return true;
      const parsed: unknown = JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf8'));
      if (!isValidSettings(parsed)) return true;
      return shouldAutoCheckForUpdates(parsed);
    } catch (error) {
      log.warn('Could not read settings for update throttle:', error);
      return true;
    }
  }

  private bindUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      if (!this.lastCheckWasManual) return;
      this.setState({ status: 'checking', userInitiated: true });
    });

    autoUpdater.on('update-available', (info) => {
      this.setState({
        status: 'available',
        version: info.version,
        releaseNotes: this.normalizeReleaseNotes(info.releaseNotes),
        releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : undefined,
        userInitiated: this.lastCheckWasManual || undefined
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      if (!this.lastCheckWasManual) {
        log.info(`Startup update check: already on latest (${info.version ?? 'unknown'})`);
        return;
      }
      this.setState({
        status: 'not-available',
        version: info.version,
        userInitiated: true
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.setState({
        status: 'downloading',
        progressPercent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
        userInitiated: true
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.setState({
        status: 'downloaded',
        version: info.version,
        releaseNotes: this.normalizeReleaseNotes(info.releaseNotes),
        releaseDate: typeof info.releaseDate === 'string' ? info.releaseDate : undefined,
        userInitiated: true
      });
    });

    autoUpdater.on('error', (error) => {
      log.error('autoUpdater error:', error);
      if (!this.lastCheckWasManual) return;
      this.setState({
        status: 'error',
        errorMessage: this.sanitizeErrorMessage(error),
        userInitiated: true
      });
    });
  }

  /** IPC handlers are process-global; register exactly once per app lifetime. */
  private registerIpcOnce(): void {
    if (UpdaterService.ipcRegistered) return;
    UpdaterService.ipcRegistered = true;

    ipcMain.handle(UPDATE_CHECK_CHANNEL, async (event) => {
      if (!this.isTrustedRenderer(event)) return this.currentState;
      await this.check(true);
      return this.currentState;
    });

    ipcMain.handle(UPDATE_DOWNLOAD_CHANNEL, async (event) => {
      if (!this.isTrustedRenderer(event)) return this.currentState;
      this.lastCheckWasManual = true;
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        log.error('downloadUpdate failed:', error);
        this.setState({
          status: 'error',
          errorMessage: this.sanitizeErrorMessage(error),
          userInitiated: true
        });
      }
      return this.currentState;
    });

    ipcMain.handle(UPDATE_INSTALL_CHANNEL, (event) => {
      if (!this.isTrustedRenderer(event)) return false;
      autoUpdater.quitAndInstall(false, true);
      return true;
    });

    ipcMain.handle(UPDATE_GET_STATE_CHANNEL, (event) => {
      if (!this.isTrustedRenderer(event)) return { status: 'idle' as const };
      return this.publicState();
    });
  }

  /** Hide background errors from the renderer — they belong in the log file only. */
  private publicState(): UpdateState {
    if (this.currentState.status === 'error' && !this.currentState.userInitiated) {
      return { status: 'idle' };
    }
    return this.currentState;
  }

  private isTrustedRenderer(event: IpcMainInvokeEvent): boolean {
    const win = this.mainWindowProvider();
    if (!win || win.isDestroyed()) return false;
    return event.sender.id === win.webContents.id;
  }

  private async check(manual: boolean): Promise<void> {
    this.lastCheckWasManual = manual;
    try {
      if (manual) {
        this.setState({ status: 'checking', userInitiated: true });
      }
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('checkForUpdates failed:', error);
      if (manual) {
        this.setState({
          status: 'error',
          errorMessage: this.sanitizeErrorMessage(error),
          userInitiated: true
        });
      }
    }
  }

  private setState(partial: Partial<UpdateState>): void {
    this.currentState = { ...this.currentState, ...partial };
    const win = this.mainWindowProvider();
    if (win && !win.isDestroyed()) {
      win.webContents.send(UPDATE_EVENT_CHANNEL, this.publicState());
    }
  }

  /**
   * electron-updater can embed entire GitHub HTML error pages in Error.message.
   * Never pass that raw string to the renderer.
   */
  private sanitizeErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);

    if (/\b404\b/.test(raw) || /not found/i.test(raw)) {
      return 'No published update was found. Publish a GitHub Release with latest.yml first.';
    }
    if (/latest\.yml/i.test(raw)) {
      return 'Update metadata (latest.yml) is missing from the GitHub Release.';
    }
    if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network/i.test(raw)) {
      return 'Could not reach the update server. Check your internet connection.';
    }
    if (/self signed|certificate|UNABLE_TO_VERIFY/i.test(raw)) {
      return 'Secure connection to the update server failed.';
    }

    const plain = raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/["{}[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plain.length > 160) {
      return `${plain.slice(0, 157)}...`;
    }
    return plain || 'Update check failed.';
  }

  private normalizeReleaseNotes(notes: unknown): string | undefined {
    let text: string | undefined;
    if (typeof notes === 'string') {
      text = notes;
    } else if (Array.isArray(notes)) {
      text = notes
        .map((entry) => (typeof entry === 'string' ? entry : entry?.note ?? ''))
        .filter(Boolean)
        .join('\n');
    }
    if (!text) return undefined;

    text = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 500) {
      return `${text.slice(0, 497)}...`;
    }
    return text;
  }
}

let updaterSingleton: UpdaterService | null = null;

/** Returns the shared updater instance (creates it on first call). */
export function getUpdaterService(
  mainWindowProvider: () => BrowserWindow | null,
  settingsFilePath: string
): UpdaterService {
  if (!updaterSingleton) {
    updaterSingleton = new UpdaterService(mainWindowProvider, settingsFilePath);
  }
  return updaterSingleton;
}
