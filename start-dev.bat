@echo off
title GudangKu - Dev Launcher
color 0A
echo.
echo  ===================================
echo   GudangKu Development Launcher
echo  ===================================
echo.

REM Cek apakah PM2 sudah running
pm2 status >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  [!] PM2 tidak terdeteksi. Install dulu dengan:
  echo      npm install -g pm2 pm2-windows-startup
  echo.
  pause
  exit /b 1
)

echo  [*] Menjalankan semua service via PM2...
pm2 start ecosystem.config.js --no-daemon

echo.
echo  [OK] Backend  : http://localhost:3001
echo  [OK] Frontend : http://localhost:3000
echo.
echo  Buka browser ke http://localhost:3000
echo.
pause
