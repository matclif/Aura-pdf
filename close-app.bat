@echo off
echo Closing Aura PDF...
taskkill /f /im "Aura PDF.exe" 2>nul
if %errorlevel% equ 0 (
    echo App closed successfully!
) else (
    echo App was not running or already closed.
)
echo.
echo You can now run the installer safely.
pause
