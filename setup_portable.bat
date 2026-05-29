@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  ChromeX — portable setup (run once)
echo ========================================
echo.

call scripts\venv_ok.bat
if errorlevel 1 (
  echo [1/3] Creating / repairing venv for this PC...
  call repair_venv.bat
) else (
  echo [1/3] Venv OK — updating packages...
  .venv\Scripts\python.exe -m pip install -r requirements.txt -q
)

echo.
echo [2/3] Downloading model to models\ (one time, ~120 MB)...
.venv\Scripts\python.exe scripts\download_model.py

echo.
echo [3/3] Done.
echo.
echo   launch_browser.bat  — ChromeX browser
echo   run_server.bat      — API only
echo.
echo USB: copy chromeX folder. On NEW PC run repair_venv.bat once.
echo.
pause
