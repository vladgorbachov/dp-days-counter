const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const os = require('os');

// GitHub repository configuration
const GITHUB_REPO = 'your-username/dp-days-counter'; // Replace with your actual GitHub username
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITHUB_DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download`;

let updateWindow = null;

// Get current app version
function getCurrentVersion() {
    return app.getVersion();
}

// Fetch latest version from GitHub
function fetchLatestVersion() {
    return new Promise((resolve, reject) => {
        const request = https.get(GITHUB_API_URL, {
            headers: {
                'User-Agent': 'DP-Days-Counter-App'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    resolve({
                        version: release.tag_name.replace('v', ''),
                        downloadUrl: release.assets.find(asset => 
                            asset.name.includes('DP-Days-Counter-Setup') && 
                            asset.name.endsWith('.exe')
                        )?.browser_download_url,
                        releaseNotes: release.body,
                        publishedAt: release.published_at
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Compare versions
function compareVersions(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        
        if (latestPart > currentPart) return 1;
        if (latestPart < currentPart) return -1;
    }
    
    return 0;
}

// Download update
function downloadUpdate(downloadUrl, progressCallback) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(os.tmpdir(), 'dp-days-counter-update');
        const installerPath = path.join(tempDir, 'DP-Days-Counter-Setup.exe');
        
        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const file = fs.createWriteStream(installerPath);
        let downloadedBytes = 0;
        let totalBytes = 0;
        
        const request = https.get(downloadUrl, (response) => {
            totalBytes = parseInt(response.headers['content-length'], 10);
            
            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
                progressCallback(progress);
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(installerPath);
            });
        });
        
        request.on('error', (error) => {
            fs.unlink(installerPath, () => {}); // Delete file on error
            reject(error);
        });
        
        file.on('error', (error) => {
            fs.unlink(installerPath, () => {}); // Delete file on error
            reject(error);
        });
    });
}

// Install update
function installUpdate(installerPath) {
    return new Promise((resolve, reject) => {
        // Try to use the updater first
        const updaterPath = path.join(__dirname, 'updater', 'dist', 'win-unpacked', 'DP-Days-Counter-Updater.exe');
        
        if (fs.existsSync(updaterPath)) {
            exec(`"${updaterPath}" "${installerPath}"`, (error) => {
                if (error) {
                    // Fallback to direct installer
                    exec(`"${installerPath}" /S`, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        } else {
            // Direct installer fallback
            exec(`"${installerPath}" /S`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }
    });
}

// Create update window
function createUpdateWindow() {
    if (updateWindow) {
        updateWindow.focus();
        return;
    }
    
    updateWindow = new BrowserWindow({
        width: 500,
        height: 400,
        resizable: false,
        maximizable: false,
        minimizable: false,
        fullscreenable: false,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'src', 'assets', 'icon.ico'),
        title: 'DP Days Counter - Update'
    });
    
    updateWindow.loadFile(path.join(__dirname, 'src', 'update.html'));
    
    updateWindow.once('ready-to-show', () => {
        updateWindow.show();
    });
    
    updateWindow.on('closed', () => {
        updateWindow = null;
    });
}

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
    try {
        const currentVersion = getCurrentVersion();
        const latestRelease = await fetchLatestVersion();
        
        if (!latestRelease.downloadUrl) {
            throw new Error('No installer found in latest release');
        }
        
        const hasUpdate = compareVersions(currentVersion, latestRelease.version) < 0;
        
        return {
            hasUpdate,
            currentVersion,
            latestVersion: latestRelease.version,
            downloadUrl: latestRelease.downloadUrl,
            releaseNotes: latestRelease.releaseNotes,
            publishedAt: latestRelease.publishedAt
        };
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('download-update', async (event, downloadUrl) => {
    try {
        const installerPath = await downloadUpdate(downloadUrl, (progress) => {
            if (updateWindow && !updateWindow.isDestroyed()) {
                updateWindow.webContents.send('download-progress', progress);
            }
        });
        
        return installerPath;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('install-update', async (event, installerPath) => {
    try {
        await installUpdate(installerPath);
        return true;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('open-update-window', () => {
    createUpdateWindow();
});

ipcMain.handle('close-update-window', () => {
    if (updateWindow && !updateWindow.isDestroyed()) {
        updateWindow.close();
    }
});

ipcMain.handle('open-github-releases', () => {
    shell.openExternal(`https://github.com/${GITHUB_REPO}/releases`);
});

module.exports = {
    createUpdateWindow,
    checkForUpdates: async () => {
        try {
            const currentVersion = getCurrentVersion();
            const latestRelease = await fetchLatestVersion();
            
            if (!latestRelease.downloadUrl) {
                return null;
            }
            
            const hasUpdate = compareVersions(currentVersion, latestRelease.version) < 0;
            
            return hasUpdate ? {
                version: latestRelease.version,
                downloadUrl: latestRelease.downloadUrl,
                releaseNotes: latestRelease.releaseNotes,
                publishedAt: latestRelease.publishedAt
            } : null;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return null;
        }
    }
}; 