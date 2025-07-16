@echo off
echo Creating DP Days Counter Update Package...

REM Create dist directory if it doesn't exist
if not exist "dist" mkdir dist

REM Copy source files to update package
echo Copying files...
xcopy "src\*" "dist\update-files\" /E /I /Y

REM Create update installer
echo Creating update installer...
echo @echo off > "dist\DP-Days-Counter-Update.exe"
echo echo Installing DP Days Counter Update... >> "dist\DP-Days-Counter-Update.exe"
echo echo. >> "dist\DP-Days-Counter-Update.exe"
echo REM Stop the application if running >> "dist\DP-Days-Counter-Update.exe"
echo taskkill /f /im "DP Days Counter.exe" ^>nul 2^>^&1 >> "dist\DP-Days-Counter-Update.exe"
echo timeout /t 2 /nobreak ^>nul >> "dist\DP-Days-Counter-Update.exe"
echo echo Installing files... >> "dist\DP-Days-Counter-Update.exe"
echo xcopy "update-files\*" "%%APPDATA%%\DP-Days-Counter\" /E /Y /Q >> "dist\DP-Days-Counter-Update.exe"
echo echo Update completed! >> "dist\DP-Days-Counter-Update.exe"
echo start "" "%%APPDATA%%\DP-Days-Counter\DP Days Counter.exe" >> "dist\DP-Days-Counter-Update.exe"
echo exit >> "dist\DP-Days-Counter-Update.exe"

echo Update package created: dist\DP-Days-Counter-Update.exe
pause 