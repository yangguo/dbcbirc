@echo off
echo Starting backend without MongoDB connection...
set DISABLE_DATABASE=true
cd backend
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
