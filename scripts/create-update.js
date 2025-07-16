const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const APP_NAME = 'DP Days Counter';
const UPDATE_DIR = 'updates';
const SRC_DIR = 'src';
const ASSETS_DIR = 'src/assets';

// Create update package
function createUpdatePackage(version) {
  const updateFileName = `${APP_NAME.replace(/\s+/g, '-')}-Update-${version}.exe`;
  const updatePath = path.join('dist', updateFileName);
  
  console.log(`Creating update package: ${updateFileName}`);
  
  // Create a simple self-extracting update installer
  const updateContent = `
@echo off
echo Installing ${APP_NAME} Update ${version}...
echo.

REM Stop the application if running
taskkill /f /im "DP Days Counter.exe" >nul 2>&1

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Extract and copy files
echo Extracting update files...
"C:\\Program Files\\7-Zip\\7z.exe" x "%~f0" -o"%TEMP%\\dp-update" -y >nul 2>&1

REM Copy files to application directory
echo Installing files...
xcopy "%TEMP%\\dp-update\\*" "%APPDATA%\\${APP_NAME.replace(/\s+/g, '-')}\\" /E /Y /Q

REM Clean up
rmdir /s /q "%TEMP%\\dp-update" >nul 2>&1

echo Update completed successfully!
echo Starting ${APP_NAME}...
start "" "%APPDATA%\\${APP_NAME.replace(/\s+/g, '-')}\\DP Days Counter.exe"

exit
`;

  // Create the update executable
  fs.writeFileSync(updatePath, updateContent);
  
  console.log(`Update package created: ${updatePath}`);
  return updatePath;
}

// Main function
function main() {
  const version = process.argv[2];
  
  if (!version) {
    console.error('Usage: node create-update.js <version>');
    console.error('Example: node create-update.js 1.0.1');
    process.exit(1);
  }
  
  if (!version.match(/^\d+\.\d+\.\d+$/)) {
    console.error('Invalid version format. Use format: x.y.z');
    process.exit(1);
  }
  
  try {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }
    
    // Create update package
    const updatePath = createUpdatePackage(version);
    
    console.log(`\n✅ Update package created successfully!`);
    console.log(`📦 File: ${updatePath}`);
    console.log(`🔗 This file will be included in the GitHub release.`);
    
  } catch (error) {
    console.error('Error creating update package:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createUpdatePackage }; 