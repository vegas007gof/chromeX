@echo off
setlocal EnableExtensions
cd /d "%~dp0"

call scripts\venv_ok.bat
if errorlevel 1 (
  echo Running repair_venv.bat ...
  call repair_venv.bat
)

.venv\Scripts\python.exe scripts\download_model.py
pause
