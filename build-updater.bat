@echo off
echo Building DP Days Counter Updater...

cd updater

echo Installing dependencies...
npm install

echo Building updater...
npm run build:win

echo Updater build complete!
echo The updater executable is located in: updater\dist\DP-Days-Counter-Updater.exe

pause 