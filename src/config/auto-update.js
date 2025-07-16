// Auto-update configuration
const AUTO_UPDATE_CONFIG = {
  // Update check intervals (in milliseconds)
  CHECK_ON_STARTUP: true,
  STARTUP_DELAY: 5000, // 5 seconds after app start
  PERIODIC_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  
  // GitHub repository settings
  GITHUB_REPO: 'delion-software/dp-days-counter',
  GITHUB_API_URL: 'https://api.github.com/repos/delion-software/dp-days-counter/releases/latest',
  
  // Update behavior
  AUTO_DOWNLOAD: false, // Don't auto-download, ask user first
  SHOW_NOTIFICATIONS: true,
  ALLOW_SKIP: true,
  
  // User preferences (stored locally)
  USER_PREFERENCES: {
    AUTO_CHECK_ENABLED: true,
    NOTIFICATION_ENABLED: true,
    LAST_CHECK_TIME: null,
    SKIPPED_VERSIONS: []
  }
};

// Update notification types
const UPDATE_NOTIFICATION_TYPES = {
  SILENT: 'silent', // Background check only
  INFO: 'info', // Informational dialog
  CONFIRM: 'confirm', // Ask user for action
  FORCE: 'force' // Force update (for critical updates)
};

// Update status
const UPDATE_STATUS = {
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DOWNLOADING: 'downloading',
  INSTALLING: 'installing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  NO_UPDATE: 'no_update'
};

module.exports = {
  AUTO_UPDATE_CONFIG,
  UPDATE_NOTIFICATION_TYPES,
  UPDATE_STATUS
}; 