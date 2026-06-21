@echo off
setlocal

cd /d "%~dp0"
title Collections Dashboard

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js and npm are required.
  echo Download Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dashboard dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Collections Dashboard...
start "" "http://localhost:5173"
call npm run dev

endlocal
