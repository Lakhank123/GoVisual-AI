@echo off
echo ===================================================
echo Starting GoVisual AI Servers (Backend + Frontend)
echo ===================================================
start "GoVisual AI - Backend API (:8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
start "GoVisual AI - Frontend Next.js (:3000)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Servers launched in their own dedicated windows!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
pause
