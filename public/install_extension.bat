@echo off
echo ===============================
echo Chrome Extension Installer
echo ===============================

echo.
echo Removing old policy (if exists)...

REG DELETE "HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\ExtensionInstallForcelist" /v 1 /f

echo.
echo Adding new extension policy...

REG ADD "HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\ExtensionInstallForcelist" ^
/v 1 /t REG_SZ ^
/d "pmhfdcknggeehgoomnkfkpclpkmnjfff;https://care-ext.vercel.app/update.xml" /f

echo.
echo Installation Done!
echo Please restart Chrome.

pause