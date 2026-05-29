@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ChromeX — download model
echo Folder: %CD%\models\
echo.

call scripts\venv_ok.bat
if errorlevel 1 (
  echo Running repair_venv.bat ...
  call repair_venv.bat
  call scripts\venv_ok.bat
  if errorlevel 1 exit /b 1
)

.venv\Scripts\python.exe scripts\download_model.py
if errorlevel 1 (
  echo.
  echo === Download failed ===
  echo Option A: download_model_mirror.bat  (mirror, if huggingface blocked)
  echo Option B: copy folder models\ from PC where ChromeX already works
  echo.
  pause
  exit /b 1
)

echo.
pause
