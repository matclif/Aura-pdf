@echo off
echo Closing PDF Renamer & Splitter...
taskkill /f /im "PDF Renamer & Splitter.exe" 2>nul
if %errorlevel% equ 0 (
    echo App closed successfully!
) else (
    echo App was not running or already closed.
)
echo.
echo You can now run the installer safely.
pause
