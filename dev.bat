@echo off
echo Starting Tyler Platform Development Environment...
echo.

:: Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: pnpm is not installed or not in PATH
    echo Please install pnpm: npm install -g pnpm
    pause
    exit /b 1
)

:: Start PostgreSQL container if not running
echo Checking PostgreSQL container...
docker ps --format "table {{.Names}}" | findstr "barbershop-pg" >nul
if errorlevel 1 (
    echo Starting PostgreSQL container...
    docker start barbershop-pg
    timeout /t 3 /nobreak >nul
) else (
    echo PostgreSQL container is already running
)

:: Run Prisma migrations and generate client for backend
echo.
echo Running Prisma migrations...
cd apps\backend
pnpm prisma migrate dev --name init >nul 2>&1
if errorlevel 1 (
    echo Prisma migration failed, trying db push instead...
    pnpm prisma db push >nul 2>&1
)
echo Generating Prisma client...
pnpm prisma:generate >nul 2>&1
cd ..\..
echo Prisma setup completed successfully

echo.
echo Starting development servers:
echo - Legacy Express App: http://localhost:3000
echo - NestJS Backend API: http://localhost:3001
echo.
echo Press Ctrl+C to stop all servers
echo.

:: Start both development servers in separate windows
start "Legacy Express App" start-legacy.bat
start "NestJS Backend API" start-backend.bat

echo.
echo Development servers are starting in separate windows:
echo - Legacy Express App: http://localhost:3000
echo - NestJS Backend API: http://localhost:3001
echo.
echo Both server windows should now be open and running.
echo Close this window or press any key to exit
pause >nul