@echo off
setlocal EnableExtensions
cd /d "%~dp0"

call scripts\venv_ok.bat
if errorlevel 1 (
  echo.
  echo Virtual environment missing or from another PC.
  echo Running repair_venv.bat ...
  echo.
  call repair_venv.bat
  call scripts\venv_ok.bat
  if errorlevel 1 exit /b 1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr "127.0.0.1:8765" ^| findstr "LISTENING"') do set "SSF_PID=%%a"

if defined SSF_PID (
  echo.
  echo [OK] Server is already running on http://127.0.0.1:8765
  echo      Process PID: %SSF_PID%
  echo.
  pause
  exit /b 0
)

echo Starting semantic filter on http://127.0.0.1:8765
echo Keep this window open.
echo.
.venv\Scripts\python.exe run_server.py
pause
