@echo off
setlocal
title SONGYU - Local Studio
cd /d "%~dp0"
if errorlevel 1 goto directory_error

where node.exe >nul 2>&1
if errorlevel 1 goto node_error

node.exe "%~dp0scripts\start-local.mjs" %*
set "SONGYU_EXIT=%errorlevel%"
if /i "%~1"=="--check" exit /b %SONGYU_EXIT%
echo.
if not "%SONGYU_EXIT%"=="0" echo [ERROR] Startup failed. Read the message above.
pause
exit /b %SONGYU_EXIT%

:node_error
echo [ERROR] Node.js was not found. Install Node.js 22.12 or newer, then retry.
pause
exit /b 1

:directory_error
echo [ERROR] Cannot open the SONGYU project directory.
pause
exit /b 1
