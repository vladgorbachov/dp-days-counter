import { contextBridge, ipcRenderer } from 'electron';

/**
 * IPC channel names. These MUST stay in sync with the constants in
 * `shared-types.ts` (which is what the main process uses). They are duplicated
 * here on purpose: Electron preload scripts run sandboxed by default since
 * Electron 20, and a sandboxed preload can only `require` electron and a tiny
 * set of built-ins. Any `require('./shared-types')` would silently fail and
 * leave `window.electronAPI` undefined — which is exactly what broke window
 * controls on first-run installs of 2.0.0.
 */
const UPDATE_EVENT_CHANNEL = 'updater:state';
const UPDATE_CHECK_CHANNEL = 'updater:check';
const UPDATE_DOWNLOAD_CHANNEL = 'updater:download';
const UPDATE_INSTALL_CHANNEL = 'updater:install';
const UPDATE_GET_STATE_CHANNEL = 'updater:get-state';

const WINDOW_STATE_CHANNEL = 'window:state';

interface UpdateStatePayload {
  status: string;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
  progressPercent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  errorMessage?: string;
}

interface WindowStatePayload {
  isMaximized: boolean;
}

const electronAPI = {
  loadDPDays: (): Promise<Record<string, number>> => ipcRenderer.invoke('load-dp-days'),
  saveDPDays: (data: Record<string, number>): Promise<boolean> =>
    ipcRenderer.invoke('save-dp-days', data),
  loadSettings: (): Promise<unknown> => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: unknown): Promise<boolean> => ipcRenderer.invoke('save-settings', data),

  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('maximize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-maximized'),
  onWindowState: (listener: (state: WindowStatePayload) => void): (() => void) => {
    const wrapped = (_event: unknown, state: WindowStatePayload) => listener(state);
    ipcRenderer.on(WINDOW_STATE_CHANNEL, wrapped);
    return () => ipcRenderer.removeListener(WINDOW_STATE_CHANNEL, wrapped);
  },

  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('open-external', url),
  loadingComplete: (): Promise<void> => ipcRenderer.invoke('loading-complete'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app-version'),

  // Updates --------------------------------------------------------------
  checkForUpdates: (): Promise<UpdateStatePayload> => ipcRenderer.invoke(UPDATE_CHECK_CHANNEL),
  downloadUpdate: (): Promise<UpdateStatePayload> => ipcRenderer.invoke(UPDATE_DOWNLOAD_CHANNEL),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke(UPDATE_INSTALL_CHANNEL),
  getUpdateState: (): Promise<UpdateStatePayload> => ipcRenderer.invoke(UPDATE_GET_STATE_CHANNEL),
  onUpdateState: (listener: (state: UpdateStatePayload) => void): (() => void) => {
    const wrapped = (_event: unknown, state: UpdateStatePayload) => listener(state);
    ipcRenderer.on(UPDATE_EVENT_CHANNEL, wrapped);
    return () => ipcRenderer.removeListener(UPDATE_EVENT_CHANNEL, wrapped);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
