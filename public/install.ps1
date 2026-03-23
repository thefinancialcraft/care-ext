# ===============================
# FAVEO EXTENSION AUTO INSTALLER
# ===============================

# Force TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$zipUrl = "https://care-ext.vercel.app/care-ext2.zip"
$zipPath = "$env:TEMP\care-ext2.zip"
$extractPath = "$env:TEMP\care_ext"
$installPath = "$env:LOCALAPPDATA\FaveoExtension"

Write-Host "`n[1/3] Downloading extension files..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "[2/3] Extracting and setting up files..." -ForegroundColor Cyan
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $installPath -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

# Detect inner folder
$inner = Get-ChildItem $extractPath
if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
    $sourcePath = $inner[0].FullName
} else {
    $sourcePath = $extractPath
}

New-Item -ItemType Directory -Force -Path $installPath | Out-Null
Copy-Item "$sourcePath\*" $installPath -Recurse -Force

Write-Host "[3/3] Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

# Try to remove the script itself if it exists locally (will fail if piped to iex, which is ok)
Remove-Item "$PSScriptRoot\install.ps1" -Force -ErrorAction SilentlyContinue

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "         COPIED SUCCESSFULLY ✅                   "
Write-Host "====================================================`n"

Write-Host "Please follow these manual steps to install in Chrome:" -ForegroundColor White
Write-Host "1. Open Chrome and navigate to: chrome://extensions/" -ForegroundColor Yellow
Write-Host "2. Enable 'Developer mode' in the top-right corner." -ForegroundColor Yellow
Write-Host "3. Click the 'Load unpacked' button." -ForegroundColor Yellow
Write-Host "4. Copy and paste the path below into the folder selection box:" -ForegroundColor Yellow

Write-Host "`n----------------------------------------------------"
Write-Host "PATH: $installPath" -ForegroundColor Green -BackgroundColor Black
Write-Host "----------------------------------------------------`n"

Write-Host "Then click 'Select Folder' and your extension will be installed!`n"

pause