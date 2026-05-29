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

.venv\Scripts\python.exe scripts\check_model.py >nul 2>&1
if errorlevel 1 (
  echo.
  echo Model not installed in: %CD%\models\
  echo.
  echo   1^) Run download_model.bat  ^(needs internet, ~120 MB^)
  echo   2^) Or copy folder models\ from another PC where ChromeX works
  echo   3^) If huggingface blocked: download_model_mirror.bat
  echo.
  pause
  exit /b 1
)

echo Starting ChromeX browser...
.venv\Scripts\python.exe chromex_browser.py
if errorlevel 1 pause
