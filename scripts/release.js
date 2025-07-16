const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Ask for new version
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter new version (e.g., 1.0.1): ', (newVersion) => {
    rl.close();
    
    if (!newVersion.match(/^\d+\.\d+\.\d+$/)) {
        console.error('Invalid version format. Use format: x.y.z');
        process.exit(1);
    }
    
    try {
        // Update package.json version
        packageJson.version = newVersion;
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        
        // Update updater package.json version
        const updaterPackagePath = path.join('updater', 'package.json');
        if (fs.existsSync(updaterPackagePath)) {
            const updaterPackageJson = JSON.parse(fs.readFileSync(updaterPackagePath, 'utf8'));
            updaterPackageJson.version = newVersion;
            fs.writeFileSync(updaterPackagePath, JSON.stringify(updaterPackageJson, null, 2));
        }
        
        // Commit changes
        execSync('git add .');
        execSync(`git commit -m "Bump version to ${newVersion}"`);
        
        // Create and push tag
        execSync(`git tag v${newVersion}`);
        execSync('git push origin main');
        execSync(`git push origin v${newVersion}`);
        
        console.log(`\n✅ Version ${newVersion} released successfully!`);
        console.log(`\n📦 GitHub Actions will automatically build and create a release.`);
        console.log(`🔗 Check: https://github.com/your-username/dp-days-counter/releases`);
        
    } catch (error) {
        console.error('Error creating release:', error.message);
        process.exit(1);
    }
}); 