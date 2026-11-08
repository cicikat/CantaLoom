@echo off
call "%~dp0start.bat" --restart %*
exit /b %errorlevel%
