@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-local.ps1" %*
set "CANTALOOM_EXIT=%errorlevel%"
if not "%CANTALOOM_EXIT%"=="0" echo Installation or startup failed. See the error above.
pause
exit /b %CANTALOOM_EXIT%
