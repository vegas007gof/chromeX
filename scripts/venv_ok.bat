@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

REM Returns 0 if .venv python works, 1 if missing or broken (copied from another PC)
if not exist ".venv\Scripts\python.exe" exit /b 1
.venv\Scripts\python.exe -c "import sys" >nul 2>&1
exit /b %errorlevel%
