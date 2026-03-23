# ===============================
# FAVEO EXTENSION AUTO INSTALLER
# ===============================

# Force TLS 1.2 for downloads from Vercel
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$zipUrl = "https://care-ext.vercel.app/care-ext2.zip"
$zipPath = "$env:TEMP\care-ext2.zip"
$extractPath = "$env:TEMP\care_ext"
$installPath = "$env:LOCALAPPDATA\FaveoExtension"

# Chrome Extension Details
$extId = "lacppofaandagpgomnkccpdepajdbeik"
$version = "1.0"
$chromeExtPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\$extId\$version"

Write-Host "Stopping Chrome to release file locks..." -ForegroundColor Cyan
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Downloading extension from Vercel..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "Cleaning old installations..." -ForegroundColor Yellow
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $installPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\$extId" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Extracting ZIP..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Detecting source files..." -ForegroundColor Cyan
$inner = Get-ChildItem $extractPath
if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
    $sourcePath = $inner[0].FullName
} else {
    $sourcePath = $extractPath
}

Write-Host "Installing base files to $installPath..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $installPath | Out-Null
Copy-Item "$sourcePath\*" $installPath -Recurse -Force

Write-Host "Injecting into Chrome profile..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $chromeExtPath | Out-Null
Copy-Item "$installPath\*" $chromeExtPath -Recurse -Force

Write-Host "Restarting Chrome..." -ForegroundColor Cyan
Start-Process "chrome.exe"

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "Extension Installed Successfully ✅"
Write-Host "==================================" -ForegroundColor Green

pause