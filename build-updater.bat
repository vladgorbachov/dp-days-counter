@echo off
echo Building DP Hours Counter Updater...

cd updater

echo Installing dependencies...
npm install

echo Building updater...
npm run build:win

echo Updater build complete!
echo The updater executable is located in: updater\dist\DP-Hours-Counter-Updater.exe

pause 