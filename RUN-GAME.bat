@echo off
REM ============================================================
REM  HERMETIC COMEDY — One-click runner for Windows
REM  Double-click this file to play the game.
REM  First run installs dependencies (takes a few minutes).
REM  Subsequent runs start instantly.
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo ===============================================
echo   HERMETIC COMEDY
echo   Preparing the silver threshold...
echo ===============================================
echo.

REM --- Check Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo [!] Node.js is not installed.
    echo.
    echo Please install Node.js LTS from:
    echo     https://nodejs.org/
    echo.
    echo Then double-click this file again.
    echo.
    pause
    exit /b 1
)

REM --- Install dependencies if missing ---
if not exist "node_modules\" (
    echo First-time setup: installing dependencies...
    echo This will take 2-5 minutes. Please wait.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [!] Install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed.
    echo.
)

REM --- Launch the dev server and open the browser ---
echo Starting the game server...
echo The game will open in your browser shortly.
echo.
echo Leave this window open while you play.
echo Close it (or press Ctrl+C) to stop the game.
echo.

start "" "http://localhost:5173"
call npm run dev

endlocal
