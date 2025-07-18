import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Data management
  loadDPDays: () => ipcRenderer.invoke('load-dp-days'),
  saveDPDays: (data: Record<string, number>) => ipcRenderer.invoke('save-dp-days', data),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: any) => ipcRenderer.invoke('save-settings', data),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized')
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
        loadDPDays: () => Promise<Record<string, number>>;
  saveDPDays: (data: Record<string, number>) => Promise<boolean>;
      loadSettings: () => Promise<any>;
      saveSettings: (data: any) => Promise<boolean>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
    };
  }
} 