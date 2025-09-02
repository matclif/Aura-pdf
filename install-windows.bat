@echo off
echo Installing Aura PDF...

REM Get the current directory (where the batch file is located)
set "APP_DIR=%~dp0"
set "APP_NAME=Aura PDF"
set "EXE_NAME=Aura PDF.exe"

REM Check if the executable exists
if not exist "%APP_DIR%%EXE_NAME%" (
    echo Error: %EXE_NAME% not found in the current directory.
    echo Please make sure you extracted all files from the ZIP.
    pause
    exit /b 1
)

REM Create desktop shortcut
echo Creating desktop shortcut...

REM Get desktop path
for /f "tokens=2*" %%a in ('reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v Desktop 2^>nul') do set "DESKTOP=%%b"

if "%DESKTOP%"=="" (
    echo Warning: Could not find desktop path. Using default.
    set "DESKTOP=%USERPROFILE%\Desktop"
)

REM Create shortcut using PowerShell
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\%APP_NAME%.lnk'); $Shortcut.TargetPath = '%APP_DIR%%EXE_NAME%'; $Shortcut.WorkingDirectory = '%APP_DIR%'; $Shortcut.Description = 'Aura PDF - Smart PDF Management Tool'; $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo Desktop shortcut created successfully!
) else (
    echo Warning: Could not create desktop shortcut automatically.
    echo You can create it manually by right-clicking on %EXE_NAME% and selecting "Create shortcut"
)

REM Create Start Menu shortcut
echo Creating Start Menu shortcut...

REM Get Start Menu Programs path
for /f "tokens=2*" %%a in ('reg query "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v "Programs" 2^>nul') do set "PROGRAMS=%%b"

if "%PROGRAMS%"=="" (
    set "PROGRAMS=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
)

REM Create Programs folder for our app
if not exist "%PROGRAMS%\PDF Tools" mkdir "%PROGRAMS%\PDF Tools"

REM Create Start Menu shortcut
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%PROGRAMS%\PDF Tools\%APP_NAME%.lnk'); $Shortcut.TargetPath = '%APP_DIR%%EXE_NAME%'; $Shortcut.WorkingDirectory = '%APP_DIR%'; $Shortcut.Description = 'Aura PDF - Smart PDF Management Tool'; $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo Start Menu shortcut created successfully!
) else (
    echo Warning: Could not create Start Menu shortcut.
)

echo.
echo Installation completed!
echo.
echo You can now:
echo 1. Find the app on your Desktop
echo 2. Find the app in Start Menu under "PDF Tools"
echo 3. Run the app directly from this folder
echo.
echo To uninstall, simply delete this folder and the shortcuts.
echo.
pause
