@echo off
title SplitSync Development Server
echo ========================================================
echo        Starting SplitSync in Live Development Mode
echo ========================================================
echo.

set PATH=C:\Program Files\nodejs;%PATH%

echo [1/2] Verifying Node.js environment...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in C:\Program Files\nodejs.
    pause
    exit /b 1
)

echo [2/2] Starting Backend (Port 5000) and Frontend (Port 3000)...
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
call "C:\Program Files\nodejs\npm.cmd" run dev

pause

