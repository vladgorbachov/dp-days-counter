const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// User preferences file path
const USER_PREFERENCES_FILE = path.join(app.getPath('userData'), 'update-preferences.json');

// Default user preferences
const DEFAULT_PREFERENCES = {
  autoCheckEnabled: true,
  notificationEnabled: true,
  lastCheckTime: null,
  skippedVersions: [],
  updateChannel: 'stable', // stable, beta, alpha
  downloadPath: null
};

// Load user preferences
function loadUserPreferences() {
  try {
    if (fs.existsSync(USER_PREFERENCES_FILE)) {
      const data = fs.readFileSync(USER_PREFERENCES_FILE, 'utf8');
      const preferences = JSON.parse(data);
      
      // Merge with defaults to ensure all properties exist
      return { ...DEFAULT_PREFERENCES, ...preferences };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  
  return { ...DEFAULT_PREFERENCES };
}

// Save user preferences
function saveUserPreferences(preferences) {
  try {
    fs.writeFileSync(USER_PREFERENCES_FILE, JSON.stringify(preferences, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
}

// Update specific preference
function updatePreference(key, value) {
  const preferences = loadUserPreferences();
  preferences[key] = value;
  return saveUserPreferences(preferences);
}

// Check if version was skipped
function isVersionSkipped(version) {
  const preferences = loadUserPreferences();
  return preferences.skippedVersions.includes(version);
}

// Add version to skipped list
function skipVersion(version) {
  const preferences = loadUserPreferences();
  if (!preferences.skippedVersions.includes(version)) {
    preferences.skippedVersions.push(version);
    saveUserPreferences(preferences);
  }
}

// Remove version from skipped list
function unskipVersion(version) {
  const preferences = loadUserPreferences();
  preferences.skippedVersions = preferences.skippedVersions.filter(v => v !== version);
  saveUserPreferences(preferences);
}

// Update last check time
function updateLastCheckTime() {
  return updatePreference('lastCheckTime', new Date().toISOString());
}

// Check if enough time has passed since last check
function shouldCheckForUpdates() {
  const preferences = loadUserPreferences();
  
  if (!preferences.autoCheckEnabled) {
    return false;
  }
  
  if (!preferences.lastCheckTime) {
    return true;
  }
  
  const lastCheck = new Date(preferences.lastCheckTime);
  const now = new Date();
  const hoursSinceLastCheck = (now - lastCheck) / (1000 * 60 * 60);
  
  // Check if at least 24 hours have passed
  return hoursSinceLastCheck >= 24;
}

module.exports = {
  loadUserPreferences,
  saveUserPreferences,
  updatePreference,
  isVersionSkipped,
  skipVersion,
  unskipVersion,
  updateLastCheckTime,
  shouldCheckForUpdates,
  DEFAULT_PREFERENCES
}; 