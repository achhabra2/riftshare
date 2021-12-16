export PATH=${PATH}:`go env GOPATH`/bin
echo "building on AMD64"
wails build -platform darwin/amd64 -clean
echo "Signing Package"
gon -log-level=info ./gon-sign.json
echo "Zipping Package"
ditto -c -k --keepParent ./build/bin/RiftShare.app ./RiftShare-darwin-amd64.zip
echo "Cleaning up"
rm -rf ./build/bin/RiftShare.app
echo "building on ARM64"
wails build -platform darwin/arm64 -clean
echo "Signing Package"
gon -log-level=info -log-json ./gon-sign.json
echo "Zipping Package"
ditto -c -k --keepParent ./build/bin/RiftShare.app ./RiftShare-darwin-arm64.zip
echo "Cleaning up"
rm -rf ./build/bin/RiftShare.app
echo "Notarizing Zip Files"
gon -log-level=info ./gon-notarize.json