@echo off
echo Starting Next.js Development Server and Opening Admin Panel...

cd /d "%~dp0\Booking Menu"

REM Check if server is already running on port 3000
netstat -a -n -o | find "3000" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo Server is already running on port 3000.
    echo Opening Admin Panel in browser...
    start http://localhost:3000/admin
    exit
)

echo Starting development server...
start cmd /k npm run dev

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Opening Admin Panel in browser...
start http://localhost:3000/admin
exit
