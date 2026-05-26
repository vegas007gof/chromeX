@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  ChromeX — portable setup (run once)
echo ========================================
echo.

if not exist ".venv\Scripts\python.exe" (
  echo [1/3] Creating Python venv...
  py -3 -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
) else (
  echo [1/3] Venv OK — updating packages...
  .venv\Scripts\python.exe -m pip install -r requirements.txt -q
)

echo.
echo [2/3] Downloading model to models\ (one time, ~120 MB)...
.venv\Scripts\python.exe scripts\download_model.py

echo.
echo [3/3] Browser uses Python + pywebview (Node.js NOT required).
echo.

echo Done.
echo   launch_browser.bat  — ChromeX browser
echo   run_server.bat      — API only (for Chrome extension)
echo.
echo Copy the whole chromeX folder to a USB drive.
pause
