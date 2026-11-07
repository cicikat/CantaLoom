@echo off
call "%~dp0start.bat" --admin %*
exit /b %errorlevel%
