@echo off
echo Setting up Bible App Offline Mode for Windows Surface...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is required but not found.
  echo Please install Node.js from https://nodejs.org/
  echo.
  echo Press any key to exit...
  pause > nul
  exit /b 1
)

echo Building the React app...
echo.
cd ..
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error: Build failed.
  echo.
  echo Press any key to exit...
  pause > nul
  exit /b 1
)

echo.
echo Copying necessary files for offline use...
cd for_windows_surface_travel
node copy_data.js

echo.
echo Setup complete!
echo.
echo To run the Bible app:
echo 1. Double-click run.bat
echo or
echo 2. Directly open index.html in your browser
echo.
echo Press any key to exit...
pause > nul