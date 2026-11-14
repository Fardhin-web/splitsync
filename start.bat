@echo off
title SplitSync - Smart Expense Splitter & Budget Tracker
echo ========================================================
echo        Starting SplitSync Full-Stack Application
echo ========================================================
echo.

set PATH=C:\Program Files\nodejs;%PATH%

echo [1/2] Verifying Node.js environment...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in C:\Program Files\nodejs.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/2] Launching SplitSync Server & Frontend on http://localhost:5000 ...
start "" http://localhost:5000
node server\src\index.js

pause

