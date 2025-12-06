@echo off
title NestJS Backend API
cd /d "%~dp0"
echo Starting NestJS Backend API...
echo Current directory: %CD%
echo About to run: pnpm dev:backend
pnpm dev:backend
echo.
echo Command finished with exit code: %ERRORLEVEL%
echo Press any key to close this window...
pause >nul