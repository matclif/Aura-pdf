@echo off
echo ========================================
echo    Aura PDF™ Installation Script
echo ========================================
echo.
echo This script will install Aura PDF™ on your Windows system.
echo.
echo Installation options:
echo 1. Install with Setup (Recommended)
echo 2. Run Portable Version
echo 3. Exit
echo.
set /p choice="Please select an option (1-3): "

if "%choice%"=="1" goto setup
if "%choice%"=="2" goto portable
if "%choice%"=="3" goto exit
goto invalid

:setup
echo.
echo Installing Aura PDF™ using the setup installer...
echo Please follow the installation wizard.
echo.
start "" "dist\Aura PDF™ Setup 2.0.0.exe"
goto end

:portable
echo.
echo Running Aura PDF™ in portable mode...
echo No installation required - just run the executable.
echo.
start "" "dist\Aura PDF™ 2.0.0.exe"
goto end

:invalid
echo.
echo Invalid choice. Please run the script again and select 1, 2, or 3.
pause
goto end

:exit
echo.
echo Installation cancelled.
goto end

:end
echo.
echo Thank you for using Aura PDF™!
echo Developed by Matovu Wycliff from Uganda
echo Email: juncliff44@gmail.com
echo.
pause