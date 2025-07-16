# GitHub Repository Setup Guide

This guide will help you set up the GitHub repository and configure the automatic update system for DP Days Counter.

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New repository"
3. Repository name: `dp-days-counter`
4. Description: `Desktop application for tracking Dynamic Positioning (DP) hours on vessels`
5. Make it **Public** (required for free GitHub Actions)
6. Don't initialize with README (we already have one)
7. Click "Create repository"

## Step 2: Update Repository URLs

Replace `your-username` with your actual GitHub username in these files:

### 1. `package.json`
```json
{
  "homepage": "https://github.com/YOUR_USERNAME/dp-days-counter",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/dp-days-counter.git"
  }
}
```

### 2. `update.js`
```javascript
const GITHUB_REPO = 'YOUR_USERNAME/dp-days-counter';
```

### 3. `README.md`
Update all links to use your username:
- `https://github.com/YOUR_USERNAME/dp-days-counter/releases`
- `https://github.com/YOUR_USERNAME/dp-days-counter/issues`

## Step 3: Push to GitHub

```bash
# Add all files
git add .

# Initial commit
git commit -m "Initial commit: DP Days Counter application"

# Add remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/dp-days-counter.git

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
1. Update version in package.json
2. Commit changes
3. Create and push tag `v1.0.0`
4. Trigger GitHub Actions to build and create release

## Step 6: Verify Release

1. Go to your repository
2. Click "Releases" on the right side
3. You should see version 1.0.0 with:
   - `DP-Days-Counter-Setup.exe` (main installer)
   - `DP-Days-Counter-Updater.exe` (update installer)

## Step 7: Test Updates

1. Install the application from the release
2. Open the app
3. Click "Check for Updates" in the sidebar
4. The app should detect the latest version from GitHub

## Update Process

### For Users
1. App automatically checks for updates
2. Users can manually check via "Check for Updates" button
3. Updates are downloaded and installed automatically

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

## Troubleshooting

### GitHub Actions Not Working
1. Check if Actions are enabled in repository settings
2. Verify the workflow file is in `.github/workflows/`
3. Check Actions tab for error messages

### Updates Not Working
1. Verify GitHub repository URL in `update.js`
2. Check if releases have the correct installer files
3. Ensure installer names match: `DP-Days-Counter-Setup.exe`

### Build Errors
1. Check Node.js version (should be 18+)
2. Verify all dependencies are installed
3. Check Windows build environment

## Security Notes

- The app uses GitHub's public API (no authentication required)
- Updates are downloaded over HTTPS
- Installers are signed and verified
- User data is stored locally only

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Verify repository configuration
3. Test locally with `npm start`
4. Check browser console for errors 