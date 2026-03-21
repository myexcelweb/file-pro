@echo off
cd /d %~dp0

echo ============================
echo   Auto Update + Versioning
echo ============================

:: Step 1: Build project
echo.
echo Building project...
call npm run build

:: Step 2: Get current version from version.txt (or create if not exists)
IF NOT EXIST version.txt (
    echo 1.0 > version.txt
)

set /p version=<version.txt

:: Step 3: Split version (major.minor)
for /f "tokens=1,2 delims=." %%a in ("%version%") do (
    set major=%%a
    set minor=%%b
)

:: Step 4: Increment minor version
set /a minor=minor+1

:: Step 5: Create new version
set new_version=%major%.%minor%

:: Step 6: Save new version
echo %new_version% > version.txt

echo.
echo New Version: v%new_version%

:: Step 7: Git add
git add .

:: Step 8: Commit with auto message
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