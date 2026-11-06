@echo off
where node.exe >nul 2>&1
if errorlevel 1 goto start_studio
node.exe "%~dp0scripts\reuse-studio.mjs" %*
if not errorlevel 1 exit /b 0
:start_studio
call "%~dp0start.bat" %*
exit /b %errorlevel%
