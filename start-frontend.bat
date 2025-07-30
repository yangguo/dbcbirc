@echo off
echo Starting CBIRC Frontend Server...
echo.

REM Change to frontend directory
cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Start the development server
echo.
echo Starting Next.js development server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm run dev
