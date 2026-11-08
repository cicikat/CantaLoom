@echo off
call "%~dp0start.bat" --restart --admin %*
exit /b %errorlevel%
