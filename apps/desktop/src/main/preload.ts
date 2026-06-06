import { contextBridge, ipcRenderer } from 'electron';
import {
  AppSettings,
  DPDays,
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_EVENT_CHANNEL,
  UPDATE_GET_STATE_CHANNEL,
  UPDATE_INSTALL_CHANNEL,
  UpdateState
} from './shared-types';

type UpdateListener = (state: UpdateState) => void;

const electronAPI = {
  loadDPDays: (): Promise<DPDays> => ipcRenderer.invoke('load-dp-days'),
  saveDPDays: (data: DPDays): Promise<boolean> => ipcRenderer.invoke('save-dp-days', data),
  loadSettings: (): Promise<AppSettings> => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: AppSettings): Promise<boolean> => ipcRenderer.invoke('save-settings', data),

  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('maximize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-maximized'),

  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('open-external', url),
  loadingComplete: (): Promise<void> => ipcRenderer.invoke('loading-complete'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app-version'),

  // Updates --------------------------------------------------------------
  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke(UPDATE_CHECK_CHANNEL),
  downloadUpdate: (): Promise<UpdateState> => ipcRenderer.invoke(UPDATE_DOWNLOAD_CHANNEL),
  installUpdate: (): Promise<boolean> => ipcRenderer.invoke(UPDATE_INSTALL_CHANNEL),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke(UPDATE_GET_STATE_CHANNEL),
  onUpdateState: (listener: UpdateListener): (() => void) => {
    const wrapped = (_event: unknown, state: UpdateState) => listener(state);
    ipcRenderer.on(UPDATE_EVENT_CHANNEL, wrapped);
    return () => ipcRenderer.removeListener(UPDATE_EVENT_CHANNEL, wrapped);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
