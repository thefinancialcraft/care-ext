# ===============================
# FAVEO EXTENSION INSTALLER (FINAL)
# ===============================

$zipUrl = "https://care-ext.vercel.app/care-ext2.zip"
$zipPath = "$env:TEMP\care-ext2.zip"
$extractPath = "$env:TEMP\care_ext"
$installPath = "$env:LOCALAPPDATA\FaveoExtension"

Write-Host "Downloading extension..."

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -ErrorAction Stop
    Write-Host "Download successful ✅"
} catch {
    Write-Host "Download failed ❌"
    pause
    exit
}

Write-Host "Cleaning old files..."

Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $installPath -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Extracting ZIP..."

try {
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -ErrorAction Stop
    Write-Host "Extract successful ✅"
} catch {
    Write-Host "Extract failed ❌"
    pause
    exit
}

Write-Host "Detecting inner folder..."

$inner = Get-ChildItem $extractPath

if ($inner.Count -eq 1 -and $inner[0].PSIsContainer) {
    $sourcePath = $inner[0].FullName
} else {
    $sourcePath = $extractPath
}

Write-Host "Installing files..."

New-Item -ItemType Directory -Force -Path $installPath | Out-Null

try {
    Copy-Item "$sourcePath\*" $installPath -Recurse -Force -ErrorAction Stop
    Write-Host "Files installed successfully ✅"
} catch {
    Write-Host "Copy failed ❌"
    pause
    exit
}

Write-Host "Closing Chrome..."
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue

# ===============================
# UX IMPROVEMENT
# ===============================

Write-Host ""
Write-Host "======================================="
Write-Host "FINAL STEP REQUIRED ⚠️"
Write-Host "======================================="
Write-Host ""
Write-Host "1. Chrome Extensions page open ho rahi hai..."
Write-Host "2. Top right me 'Developer Mode' ON karo"
Write-Host "3. 'Load unpacked' pe click karo"
Write-Host "4. Ye folder select karo:"
Write-Host "$installPath"
Write-Host ""
Write-Host "======================================="

# Open Chrome extensions page
Start-Process "chrome://extensions/"

# Open folder for easy selection
Start-Process explorer.exe $installPath

Write-Host ""
Write-Host "Path copied for convenience:"
Write-Host "$installPath"

pause