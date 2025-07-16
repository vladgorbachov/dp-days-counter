@echo off
echo Building DP Days Counter...

REM Install dependencies
echo Installing dependencies...
npm install

REM Build main application
echo Building main application...
npm run build:win

REM Create update package
echo Creating update package...
call create-update.bat

echo Build complete!
echo Files created:
echo - dist\DP-Days-Counter-Setup.exe (Main installer)
echo - dist\DP-Days-Counter-Update.exe (Update package)
pause 