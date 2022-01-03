@echo off
echo "Building for Windows"
wails build -platform windows/amd64 -clean -webview2 embed
echo "Creating MSIX Package"
cd build\windows
MakeAppx pack /m appxmanifest.xml /f mapping.txt /p RiftShare.msix
move RiftShare.msix ..\..\
cd ..\..\
rename RiftShare.msix RiftShare-windows-amd64.msix
echo "Signing Packages"
SignTool sign /fd SHA256 /a /f %WINDOWS_CERT_PATH% /p %WINDOWS_CERT_PASSWORD% /t http://timestamp.digicert.com RiftShare-windows-amd64.msix
SignTool sign /fd SHA256 /a /f %WINDOWS_CERT_PATH% /p %WINDOWS_CERT_PASSWORD% /t http://timestamp.digicert.com .\build\bin\RiftShare.exe
echo "Compressing exe"
Compress-Archive -Path .\build\bin\RiftShare.exe -DestinationPath .\RiftShare-windows-amd64.zip