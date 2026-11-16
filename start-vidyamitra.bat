@echo off
setlocal
title Vidyamitra
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js was not found on this computer.
  echo  Install the LTS version from https://nodejs.org and run this file again.
  echo  Quick install from a terminal: winget install OpenJS.NodeJS.LTS
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo  First run - installing dependencies. This takes a few minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  npm install failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  Starting Vidyamitra at http://localhost:3000
echo  Keep this window open while you use the app.
echo  To stop it later, double-click stop-vidyamitra.bat.
echo.
call npm run dev
pause

