@echo off
setlocal
title Stop Vidyamitra
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js was not found on this computer, so this helper cannot run.
  echo  You can still stop the app by closing its terminal window.
  echo.
  pause
  exit /b 1
)

echo.
echo  Stopping Vidyamitra...
echo.
node scripts\stop-dev.mjs
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" (
  echo  Something on the port could not be stopped.
  echo  Close the window running Vidyamitra, then run this file again.
) else (
  echo  You can close this window now.
)
echo.
pause
