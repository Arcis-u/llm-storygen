@echo off
title Interactive Story Engine - Launcher
color 0A
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Interactive Story AI - Starting Services...   ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Start Backend (FastAPI with venv)
echo [1/2] Starting Backend (FastAPI)...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend (Next.js)
echo [2/2] Starting Frontend (Next.js)...
start "Frontend - Next.js" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait and open browser
timeout /t 5 /nobreak > nul
echo.
echo  ✓ Backend:  http://localhost:8000
echo  ✓ Frontend: http://localhost:3000
echo.
start http://localhost:3000
echo  All services started! You can close this window.
pause
