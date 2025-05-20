@echo off
echo Starting Bible App in Offline Mode...
echo.
echo This launcher will open the Bible app in your default browser.
echo No server will be started - all data loads from local files.
echo.
echo Optimized for Windows Surface devices to save battery.
echo.

REM Open the app in the default browser
start "" index.html

echo.
echo If the browser doesn't open automatically, manually open:
echo %~dp0index.html
echo.
echo Press any key to exit...
pause > nul