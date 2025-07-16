const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const os = require('os');

// GitHub repository configuration - БУДЕТ ИЗМЕНЕНО НА РЕАЛЬНЫЙ РЕПОЗИТОРИЙ
const GITHUB_REPO = 'REAL_USERNAME/dp-days-counter'; // ЗАМЕНИТЬ НА РЕАЛЬНЫЙ
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

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
                            asset.name.includes('DP-Days-Counter-Update') && 
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
        const installerPath = path.join(tempDir, 'DP-Days-Counter-Update.exe');
        
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
        // Run the update installer silently
        exec(`"${installerPath}" /SILENT /CLOSEAPPLICATIONS`, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

// Show update dialog
async function showUpdateDialog(updateInfo) {
    const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${updateInfo.version}) is available!`,
        detail: 'Would you like to download and install the update now?',
        buttons: ['Yes', 'Later', 'View Details'],
        defaultId: 0,
        cancelId: 1
    });
    
    switch (result.response) {
        case 0: // Yes
            return 'install';
        case 2: // View Details
            shell.openExternal(`https://github.com/${GITHUB_REPO}/releases`);
            return 'view';
        default: // Later
            return 'later';
    }
}

// Show download progress dialog
async function showDownloadProgress() {
    return new Promise((resolve) => {
        const progressDialog = new BrowserWindow({
            width: 400,
            height: 150,
            resizable: false,
            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: 'Downloading Update'
        });
        
        progressDialog.loadURL(`data:text/html,
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                        .progress { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
                        .progress-bar { height: 100%; background: #007acc; width: 0%; transition: width 0.3s; }
                    </style>
                </head>
                <body>
                    <h3>Downloading Update...</h3>
                    <div class="progress">
                        <div id="progress-bar" class="progress-bar"></div>
                    </div>
                    <p id="progress-text">0%</p>
                </body>
            </html>
        `);
        
        progressDialog.once('ready-to-show', () => {
            progressDialog.show();
        });
        
        // Handle progress updates
        ipcMain.handle('update-progress', (event, progress) => {
            progressDialog.webContents.executeJavaScript(`
                document.getElementById('progress-bar').style.width = '${progress}%';
                document.getElementById('progress-text').textContent = '${Math.round(progress)}%';
            `);
        });
        
        // Handle completion
        ipcMain.handle('download-complete', () => {
            progressDialog.close();
            resolve();
        });
        
        // Handle error
        ipcMain.handle('download-error', (event, error) => {
            progressDialog.close();
            dialog.showErrorBox('Download Error', error);
            resolve();
        });
    });
}

// IPC handlers
ipcMain.handle('check-for-updates', async () => {
    try {
        const currentVersion = getCurrentVersion();
        const latestRelease = await fetchLatestVersion();
        
        if (!latestRelease.downloadUrl) {
            throw new Error('No update installer found in latest release');
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

ipcMain.handle('check-updates-manual', async () => {
    try {
        const update = await checkForUpdates();
        if (update) {
            const action = await showUpdateDialog(update);
            if (action === 'install') {
                await showDownloadProgress();
                const installerPath = await downloadUpdate(update.downloadUrl, (progress) => {
                    // Progress will be handled by the dialog
                });
                await installUpdate(installerPath);
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Update Complete',
                    message: 'Update has been installed successfully. The application will restart.',
                    buttons: ['OK']
                });
                app.relaunch();
                app.exit();
            }
        } else {
            dialog.showMessageBox({
                type: 'info',
                title: 'No Updates',
                message: 'You are using the latest version!',
                buttons: ['OK']
            });
        }
        return update;
    } catch (error) {
        dialog.showErrorBox('Update Error', error.message);
        return null;
    }
});

ipcMain.handle('open-github-releases', () => {
    shell.openExternal(`https://github.com/${GITHUB_REPO}/releases`);
});

module.exports = {
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