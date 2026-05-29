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

if not exist "models\paraphrase-multilingual-MiniLM-L12-v2" (
  echo Model not found. Run download_model.bat
  pause
  exit /b 1
)

echo Starting ChromeX browser...
.venv\Scripts\python.exe chromex_browser.py
if errorlevel 1 pause
