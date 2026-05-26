@echo off
setlocal EnableExtensions

set "EXT_DIR=%~dp0extension"
set "EXT_DIR=%EXT_DIR:~0,-1%"

echo ========================================
echo  Semantic Search Filter - Extension
echo ========================================
echo.
echo Extension folder:
echo   %EXT_DIR%
echo.
echo Chrome does not allow silent install of unpacked extensions.
echo Load it manually:
echo.
echo   1. Start the Python server:  python run_server.py
echo   2. Open:  chrome://extensions/
echo   3. Enable "Developer mode" (top right)
echo   4. Click "Load unpacked"
echo   5. Select folder:  %EXT_DIR%
echo.
echo Optional: open extensions page now.
set /p OPEN="Open chrome://extensions/ now? [Y/n]: "
if /i "%OPEN%"=="n" goto :done
start "" "chrome://extensions/"
:done
echo.
pause
