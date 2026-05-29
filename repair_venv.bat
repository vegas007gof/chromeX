@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

echo ========================================
echo  ChromeX — repair venv (new PC / USB)
echo ========================================
echo.
echo .venv is tied to Python on the PC where it was created.
echo On a new computer run this script once.
echo.

if exist ".venv" (
  echo Removing old .venv ...
  rmdir /s /q ".venv"
)

set "PYCMD="
py -3 -c "import sys" >nul 2>&1 && set "PYCMD=py -3"
if not defined PYCMD (
  python -c "import sys" >nul 2>&1 && set "PYCMD=python"
)
if not defined PYCMD (
  for %%V in (313 312 311 310) do (
    if exist "C:\Program Files\Python%%V\python.exe" (
      set "PYCMD=C:\Program Files\Python%%V\python.exe"
      goto :found
    )
  )
)
:found

if not defined PYCMD (
  echo ERROR: Python 3.10+ not found.
  echo Install from https://www.python.org/downloads/
  echo Enable "Add python.exe to PATH" during install.
  pause
  exit /b 1
)

echo Using: %PYCMD%
echo Creating .venv ...
%PYCMD% -m venv .venv
if errorlevel 1 (
  echo Failed to create venv.
  pause
  exit /b 1
)

.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt

echo.
echo Venv repaired for this PC.
echo You can run launch_browser.bat now.
echo.
pause
