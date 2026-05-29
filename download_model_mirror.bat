@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set USE_HF_MIRROR=1
call download_model.bat
