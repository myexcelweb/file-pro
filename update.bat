@echo off
cd /d %~dp0

echo ============================
echo   Auto Update + Versioning
echo ============================

:: Step 1: Build project
echo.
echo Building project...
call npm run build

:: Step 2: Create version file if not exists
IF NOT EXIST version.txt (
    echo 1.0 > version.txt
)

:: Step 3: Read version
set /p version=<version.txt

:: Step 4: Split version
for /f "tokens=1,2 delims=." %%a in ("%version%") do (
    set major=%%a
    set minor=%%b
)

:: Step 5: Increment
set /a minor=minor+1
set new_version=%major%.%minor%

:: Step 6: Save version
echo %new_version% > version.txt

echo.
echo New Version: v%new_version%

:: Step 7: Add files (EXPLICIT)
git add .
git add update.bat
git add version.txt

:: Step 8: Commit only if changes exist
git diff --cached --quiet
IF %ERRORLEVEL%==0 (
    echo No changes to commit.
) ELSE (
    git commit -m "update v%new_version%"
    git push
)

echo.
echo ============================
echo   DONE 🚀 Version v%new_version%
echo ============================

pause