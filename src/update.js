const { ipcRenderer } = require('electron');

// DOM Elements
const closeBtn = document.getElementById('closeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const skipBtn = document.getElementById('skipBtn');
const closeUpdateBtn = document.getElementById('closeUpdateBtn');
const retryBtn = document.getElementById('retryBtn');
const closeErrorBtn = document.getElementById('closeErrorBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const currentVersionSpan = document.getElementById('currentVersion');
const latestVersionSpan = document.getElementById('latestVersion');
const errorMessage = document.getElementById('errorMessage');

// State elements
const checkingState = document.getElementById('checkingState');
const updateAvailableState = document.getElementById('updateAvailableState');
const downloadingState = document.getElementById('downloadingState');
const installingState = document.getElementById('installingState');
const noUpdateState = document.getElementById('noUpdateState');
const errorState = document.getElementById('errorState');

let updateInfo = null;

// Initialize update check
async function initUpdateCheck() {
  try {
    const result = await ipcRenderer.invoke('check-updates');
    
    if (result.error) {
      showError(result.error);
      return;
    }
    
    if (result.hasUpdate) {
      updateInfo = result;
      showUpdateAvailable(result);
    } else {
      showNoUpdate();
    }
  } catch (error) {
    showError('Failed to check for updates: ' + error.message);
  }
}

// Show update available state
function showUpdateAvailable(info) {
  hideAllStates();
  updateAvailableState.style.display = 'block';
  
  currentVersionSpan.textContent = info.currentVersion;
  latestVersionSpan.textContent = info.latestVersion;
}

// Show downloading state
function showDownloading() {
  hideAllStates();
  downloadingState.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
}

// Show installing state
function showInstalling() {
  hideAllStates();
  installingState.style.display = 'block';
}

// Show no update state
function showNoUpdate() {
  hideAllStates();
  noUpdateState.style.display = 'block';
}

// Show error state
function showError(message) {
  hideAllStates();
  errorState.style.display = 'block';
  errorMessage.textContent = message;
}

// Hide all states
function hideAllStates() {
  checkingState.style.display = 'none';
  updateAvailableState.style.display = 'none';
  downloadingState.style.display = 'none';
  installingState.style.display = 'none';
  noUpdateState.style.display = 'none';
  errorState.style.display = 'none';
}

// Download update
async function downloadUpdate() {
  if (!updateInfo) return;
  
  showDownloading();
  
  try {
    const result = await ipcRenderer.invoke('download-update', updateInfo.downloadUrl);
    
    if (result.success) {
      showInstalling();
      // Install the update
      ipcRenderer.invoke('install-update', result.filePath);
    } else {
      showError('Failed to download update: ' + result.error);
    }
  } catch (error) {
    showError('Download failed: ' + error.message);
  }
}

// Close update window
function closeUpdateWindow() {
  ipcRenderer.invoke('close-update-window');
}

// Event Listeners
closeBtn.addEventListener('click', closeUpdateWindow);
closeUpdateBtn.addEventListener('click', closeUpdateWindow);
closeErrorBtn.addEventListener('click', closeUpdateWindow);

downloadBtn.addEventListener('click', downloadUpdate);
skipBtn.addEventListener('click', closeUpdateWindow);
retryBtn.addEventListener('click', initUpdateCheck);

// Listen for download progress
ipcRenderer.on('download-progress', (event, progress) => {
  progressFill.style.width = progress + '%';
  progressText.textContent = Math.round(progress) + '%';
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Start update check after a short delay
  setTimeout(initUpdateCheck, 500);
}); 