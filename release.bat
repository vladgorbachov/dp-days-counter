@echo off
set /p version="Enter version (e.g., 1.0.0): "

echo Updating version to %version%...

REM Update package.json version
powershell -Command "(Get-Content package.json) -replace '\"version\": \"[^\"]*\"', '\"version\": \"%version%\"' | Set-Content package.json"

REM Commit changes
git add .
git commit -m "Release version %version%"

REM Create and push tag
git tag v%version%
git push origin main
git push origin v%version%

echo Release v%version% created successfully!
echo GitHub Actions will automatically build and create a release.
pause 