@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-windows.ps1" %*
set "result=%errorlevel%"
for %%A in (%*) do if /i "%%~A"=="--check" exit /b %result%
if not "%result%"=="0" pause
exit /b %result%
