@echo off
setlocal
title CantaLoom - Local Studio
cd /d "%~dp0"
if errorlevel 1 goto directory_error

where node.exe >nul 2>&1
if errorlevel 1 goto node_error

node.exe "%~dp0scripts\start-local.mjs" %*
set "CANTALOOM_EXIT=%errorlevel%"
for %%A in (%*) do if /i "%%~A"=="--check" exit /b %CANTALOOM_EXIT%
echo.
if not "%CANTALOOM_EXIT%"=="0" echo [ERROR] Startup failed. Read the message above.
pause
exit /b %CANTALOOM_EXIT%

:node_error
echo [ERROR] Node.js was not found. Install Node.js 22.12 or newer, then retry.
pause
exit /b 1

:directory_error
echo [ERROR] Cannot open the CantaLoom project directory.
pause
exit /b 1
