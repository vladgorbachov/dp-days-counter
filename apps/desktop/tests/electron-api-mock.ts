/** Minimal electronAPI stub for Playwright tests running outside Electron. */
export const ELECTRON_API_MOCK = `
window.electronAPI = {
  loadDPDays: async () => ({}),
  saveDPDays: async () => true,
  loadSettings: async () => ({ theme: 'dark' }),
  saveSettings: async () => true,
  minimizeWindow: async () => {},
  maximizeWindow: async () => {},
  closeWindow: async () => {},
  isMaximized: async () => false,
  onWindowState: () => () => {},
  openExternal: async () => true,
  loadingComplete: async () => {},
  getAppVersion: async () => '2.0.0',
  checkForUpdates: async () => ({ status: 'not-available', version: '2.0.0' }),
  downloadUpdate: async () => ({ status: 'downloading', progressPercent: 0 }),
  installUpdate: async () => true,
  getUpdateState: async () => ({ status: 'idle' }),
  onUpdateState: () => () => {}
};
`;
