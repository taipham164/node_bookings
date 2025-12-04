@echo off
title Legacy Express Server
cd /d "%~dp0"
echo Starting Legacy Express Server...
echo Current directory: %CD%
echo About to run: pnpm dev:legacy
pnpm dev:legacy
echo.
echo Command finished with exit code: %ERRORLEVEL%
echo Press any key to close this window...
pause >nul