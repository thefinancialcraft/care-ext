<# :
@echo off
TITLE Faveo Extension Installer
color 0b

echo ====================================================
echo      FAVEO EXTENSION - AUTO INSTALLER (Bypass)
echo ====================================================
echo.
echo Please wait while we prepare the installation context...

:: This command launches the PowerShell section of this same file
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((Get-Content '%~f0') -join \"`n\")"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Something went wrong during the installation.
    pause
)

exit /b
#>

# ==============================================================================
# POWERSHELL SECTION STARTS HERE
# ==============================================================================

# Force TLS 1.2 for secure downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Configuration
$zipUrl = "https://faveo-extension.thefinancialcraft.com/care-ext2.zip"
$zipPath = "$env:TEMP\care-ext2.zip"
$extractPath = "$env:TEMP\care_ext"
$installPath = "$env:LOCALAPPDATA\FaveoExtension"

try {
    Write-Host "`n[1/3] Downloading latest extension files..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 30

    Write-Host "[2/3] Extracting and preparing files..." -ForegroundColor Cyan
    if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path $installPath) { Remove-Item $installPath -Recurse -Force -ErrorAction SilentlyContinue }
    
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

    # Detect if the ZIP has a nested folder
    $inner = Get-ChildItem $extractPath
    if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
        $sourcePath = $inner[0].FullName
    } else {
        $sourcePath = $extractPath
    }

    New-Item -ItemType Directory -Force -Path $installPath | Out-Null
    Copy-Item "$sourcePath\*" $installPath -Recurse -Force

    Write-Host "[3/3] Finalizing and cleaning up..." -ForegroundColor Cyan
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "`n====================================================" -ForegroundColor Green
    Write-Host "         FILES COPIED SUCCESSFULLY ✅             "
    Write-Host "====================================================`n"

    Write-Host "FOLLOW THESE STEPS TO INSTALL IN CHROME:" -ForegroundColor White
    Write-Host "1. Open Chrome and go to: chrome://extensions/" -ForegroundColor Yellow
    Write-Host "2. Enable 'Developer mode' (top-right toggle)." -ForegroundColor Yellow
    Write-Host "3. Click 'Load unpacked' button." -ForegroundColor Yellow
    Write-Host "4. Paste the path below and click 'Select Folder':" -ForegroundColor Yellow

    Write-Host "`n----------------------------------------------------"
    Write-Host "PATH: $installPath" -ForegroundColor Green -BackgroundColor Black
    Write-Host "----------------------------------------------------`n"

    Write-Host "Done! The extension should now appear in your list.`n"
}
catch {
    Write-Host "`n[!] INSTALLATION FAILED:" -ForegroundColor Red
    Write-Host "$($_.Exception.Message)" -ForegroundColor White
    Write-Host "`nPlease try running the command again or check your internet." -ForegroundColor Yellow
}

Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
