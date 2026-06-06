/**
 * Renderer-side mirror of the contextBridge API exposed in `preload.ts`.
 * Kept as a `.d.ts` (no runtime emit) so the renderer never imports main.
 */

export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  lastUpdateCheck?: string;
  autoUpdateCheck?: boolean;
}

export type DPDays = Record<string, number>;

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
  progressPercent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  errorMessage?: string;
}

export interface WindowState {
  isMaximized: boolean;
}

export interface ElectronAPI {
  loadDPDays: () => Promise<DPDays>;
  saveDPDays: (data: DPDays) => Promise<boolean>;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (data: AppSettings) => Promise<boolean>;

  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onWindowState: (listener: (state: WindowState) => void) => () => void;

  openExternal: (url: string) => Promise<boolean>;
  loadingComplete: () => Promise<void>;
  getAppVersion: () => Promise<string>;

  checkForUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  installUpdate: () => Promise<boolean>;
  getUpdateState: () => Promise<UpdateState>;
  onUpdateState: (listener: (state: UpdateState) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
