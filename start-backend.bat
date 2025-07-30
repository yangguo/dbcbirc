@echo off
echo Starting CBIRC Backend Server...
echo.

REM Change to backend directory
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Set environment variables
set PYTHONPATH=%CD%

REM Start the server
echo.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
