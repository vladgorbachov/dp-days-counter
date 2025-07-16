const { ipcRenderer } = require('electron');

// DOM Elements
const closeBtn = document.getElementById('closeBtn');
const installBtn = document.getElementById('installBtn');
const cancelBtn = document.getElementById('cancelBtn');
const retryBtn = document.getElementById('retryBtn');
const closeErrorBtn = document.getElementById('closeErrorBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const installerPathSpan = document.getElementById('installerPath');
const installerSizeSpan = document.getElementById('installerSize');
const errorMessage = document.getElementById('errorMessage');

// State elements
const initialState = document.getElementById('initialState');
const installingState = document.getElementById('installingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');

let installerPath = null;
let installationProgress = 0;

// Initialize updater
async function initUpdater() {
  try {
    // Получаем путь к установщику из аргументов командной строки
    installerPath = await ipcRenderer.invoke('get-installer-path');
    
    if (!installerPath) {
      showError('No installer path provided');
      return;
    }
    
    // Проверяем существование файла установщика
    const installerInfo = await ipcRenderer.invoke('check-installer', installerPath);
    
    if (!installerInfo.exists) {
      showError('Installer file not found: ' + installerPath);
      return;
    }
    
    // Отображаем информацию об установщике
    installerPathSpan.textContent = installerInfo.path;
    installerSizeSpan.textContent = formatFileSize(installerInfo.size);
    
  } catch (error) {
    showError('Failed to initialize updater: ' + error.message);
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show installing state
function showInstalling() {
  hideAllStates();
  installingState.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  
  // Симулируем прогресс установки
  simulateInstallationProgress();
}

// Show success state
function showSuccess() {
  hideAllStates();
  successState.style.display = 'block';
}

// Show error state
function showError(message) {
  hideAllStates();
  errorState.style.display = 'block';
  errorMessage.textContent = message;
}

// Hide all states
function hideAllStates() {
  initialState.style.display = 'none';
  installingState.style.display = 'none';
  successState.style.display = 'none';
  errorState.style.display = 'none';
}

// Simulate installation progress
function simulateInstallationProgress() {
  const interval = setInterval(() => {
    installationProgress += Math.random() * 15;
    
    if (installationProgress >= 100) {
      installationProgress = 100;
      clearInterval(interval);
    }
    
    progressFill.style.width = installationProgress + '%';
    progressText.textContent = Math.round(installationProgress) + '%';
  }, 200);
}

// Install update
async function installUpdate() {
  if (!installerPath) {
    showError('No installer path available');
    return;
  }
  
  showInstalling();
  
  try {
    const result = await ipcRenderer.invoke('install-update', installerPath);
    
    if (!result.success) {
      showError('Failed to start installation: ' + result.error);
    }
  } catch (error) {
    showError('Installation failed: ' + error.message);
  }
}

// Close updater
function closeUpdater() {
  ipcRenderer.invoke('close-updater');
}

// Event Listeners
closeBtn.addEventListener('click', closeUpdater);
cancelBtn.addEventListener('click', closeUpdater);
closeErrorBtn.addEventListener('click', closeUpdater);

installBtn.addEventListener('click', installUpdate);
retryBtn.addEventListener('click', installUpdate);

// Listen for installation events
ipcRenderer.on('install-success', () => {
  showSuccess();
});

ipcRenderer.on('install-error', (event, error) => {
  showError('Installation error: ' + error);
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initUpdater, 500);
}); 