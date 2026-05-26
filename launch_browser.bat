@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Run setup_portable.bat first.
  pause
  exit /b 1
)

if not exist "models\paraphrase-multilingual-MiniLM-L12-v2" (
  echo Model not found. Run download_model.bat
  pause
  exit /b 1
)

echo Starting ChromeX browser...
.venv\Scripts\python.exe -m pip install pywebview -q 2>nul
.venv\Scripts\python.exe chromex_browser.py
if errorlevel 1 pause
