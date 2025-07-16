# GitHub Repository Setup Guide

This guide will help you set up the GitHub repository and configure the automatic update system for DP Days Counter by DeLion Software.

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository"
3. Repository name: `dp-days-counter`
4. Description: `Professional desktop application for tracking Dynamic Positioning (DP) hours on vessels`
5. Make it **Public** (required for free GitHub Actions)
6. Don't initialize with README (we already have one)
7. Click "Create repository"

## Step 2: Update Repository URLs

The repository is already configured for `delion-software/dp-days-counter`. If you need to change it:

### 1. `package.json`
```json
{
  "homepage": "https://github.com/delion-software/dp-days-counter",
  "repository": {
    "type": "git",
    "url": "https://github.com/delion-software/dp-days-counter.git"
  }
}
```

### 2. `update.js`
```javascript
const GITHUB_REPO = 'delion-software/dp-days-counter';
```

### 3. `src/config/auto-update.js`
```javascript
GITHUB_REPO: 'delion-software/dp-days-counter',
GITHUB_API_URL: 'https://api.github.com/repos/delion-software/dp-days-counter/releases/latest',
```

## Step 3: Push to GitHub

```bash
# Add all files
git add .

# Initial commit
git commit -m "Initial commit: DP Days Counter application by DeLion Software"

# Add remote origin
git remote add origin https://github.com/delion-software/dp-days-counter.git

# Push to main branch
git push -u origin main
```

## Step 4: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Click "Enable Actions"
4. The workflow will be automatically detected from `.github/workflows/release.yml`

## Step 5: Create First Release

```bash
# Run the release script
npm run release

# Enter version: 1.0.0
```

This will:
1. Update version in package.json files
2. Create update package
3. Commit changes
4. Create and push tag `v1.0.0`
5. Trigger GitHub Actions to build and create release

## Step 6: Verify Release

1. Go to your repository
2. Click "Releases" on the right side
3. You should see version 1.0.0 with:
   - `DP-Days-Counter-Setup.exe` (main installer)
   - `DP-Days-Counter-Updater.exe` (update installer)
   - `DP-Days-Counter-Update.exe` (update package)

## Step 7: Test Updates

1. Install the application from the release
2. Open the app
3. Click "Check for Updates" in the sidebar
4. The app should detect the latest version from GitHub

## Update System Architecture

### Components:
1. **Main Application** - The main DP Days Counter app
2. **Updater** - Separate application for handling updates
3. **Update Package** - Self-contained update installer

### Update Process:
1. **Check for Updates** - App queries GitHub API
2. **Download Update** - Downloads update package
3. **Launch Updater** - Starts separate updater application
4. **Install Update** - Updater installs new files
5. **Restart App** - Application restarts with new version

### Files Created:
- `DP-Days-Counter-Setup.exe` - Full installer for new installations
- `DP-Days-Counter-Updater.exe` - Portable updater application
- `DP-Days-Counter-Update.exe` - Update package for existing installations

## Build Process

### Main Application:
```bash
npm run build:win
```

### Updater:
```bash
npm run build-updater
# or
cd updater && npm run build:win
```

### Complete Build:
```bash
npm run build-all
```

## Update Process

### For Users
1. App automatically checks for updates every 24 hours
2. Users can manually check via "Check for Updates" button
3. Updates are downloaded and installed automatically
4. No npm or development tools required on target PC

### For Developers
To release a new version:

```bash
# Make your changes
git add .
git commit -m "Your changes"

# Create new release
npm run release
# Enter new version (e.g., 1.0.1)
```

## Configuration Files

### Auto-update Settings (`src/config/auto-update.js`)
- Update check intervals
- GitHub repository settings
- Update behavior preferences

### User Preferences (`src/config/user-preferences.js`)
- User-specific update settings
- Skipped versions tracking
- Last check time

## Troubleshooting

### GitHub Actions Not Working
1. Check if Actions are enabled in repository settings
2. Verify the workflow file is in `.github/workflows/`
3. Check Actions tab for error messages

### Updates Not Working
1. Verify GitHub repository URL in `update.js`
2. Check if releases have the correct update files
3. Ensure file names match: `DP-Days-Counter-Update.exe`

### Build Errors
1. Check Node.js version (should be 18+)
2. Verify all dependencies are installed
3. Check Windows build environment

## Security Notes

- The app uses GitHub's public API (no authentication required)
- Updates are downloaded over HTTPS
- Update packages are self-contained and don't require npm
- User data is stored locally only
- Updates preserve user data and settings

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Verify repository configuration
3. Test locally with `npm start`
4. Check browser console for errors

For commercial support and custom development, contact DeLion Software. 