# ===============================
# FAVEO EXTENSION AUTO INSTALLER
# ===============================

$zipUrl = "https://care-ext.vercel.app/care-ext2.zip"
$zipPath = "$env:TEMP\care-ext2.zip"
$extractPath = "$env:TEMP\care_ext"
$installPath = "$env:LOCALAPPDATA\FaveoExtension"

# 🔥 CHANGE THESE
$extId = "lacppofaandagpgomnkccpdepajdbeik"
$version = "1.0"

$chromeExtPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\$extId\$version"

Write-Host "Downloading extension..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

Write-Host "Cleaning old files..."
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $installPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\$extId" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Extracting ZIP..."
Expand-Archive -Path $zipPath -DestinationPath $extractPath

Write-Host "Detecting inner folder..."

$inner = Get-ChildItem $extractPath

if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
    $sourcePath = $inner[0].FullName
} else {
    $sourcePath = $extractPath
}

Write-Host "Installing base files..."
New-Item -ItemType Directory -Force -Path $installPath | Out-Null
Copy-Item "$sourcePath\*" $installPath -Recurse -Force

Write-Host "Injecting into Chrome..."

# Create Chrome extension folder
New-Item -ItemType Directory -Force -Path $chromeExtPath | Out-Null

# Copy extension into Chrome profile
Copy-Item "$installPath\*" $chromeExtPath -Recurse -Force

Write-Host "Restarting Chrome..."

Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Process chrome

Write-Host "=================================="
Write-Host "Extension Installed Successfully ✅"
Write-Host "=================================="

pause