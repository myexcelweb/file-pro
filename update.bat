@echo off
echo ============================
echo   Updating Project & Git
echo ============================

:: Go to project folder (optional if already inside)
cd /d %~dp0

echo.
echo Installing dependencies...
call npm install

echo.
echo Building project...
call npm run build

echo.
echo Adding changes to git...
git add .

echo.
echo Commit changes...
set /p msg=Enter commit message: 
git commit -m "%msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo ============================
echo   DONE 🚀
echo ============================

pause