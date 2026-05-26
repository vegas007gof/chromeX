@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  py -3 -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr "127.0.0.1:8765" ^| findstr "LISTENING"') do set "SSF_PID=%%a"

if defined SSF_PID (
  echo.
  echo [OK] Server is already running on http://127.0.0.1:8765
  echo      Process PID: %SSF_PID%
  echo      Health:      http://127.0.0.1:8765/health
  echo.
  echo To restart: run stop_server.bat, then run this file again.
  echo.
  pause
  exit /b 0
)

echo Starting semantic filter on http://127.0.0.1:8765
echo First run downloads the model (~120 MB). Keep this window open.
echo.
.venv\Scripts\python.exe run_server.py
pause
