@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "FOUND="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "127.0.0.1:8765" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Stopping process on port 8765, PID %%a ...
  taskkill /PID %%a /F >nul 2>&1
  if errorlevel 1 (
    echo Failed to stop PID %%a. Try closing the other server window or run as Administrator.
    pause
    exit /b 1
  )
  echo Done.
)

if not defined FOUND (
  echo No server listening on port 8765.
)

timeout /t 2 >nul
pause
