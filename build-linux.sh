#! bin/bash
# cd ./build/linux/
# flatpak-builder flatpak app.riftshare.RiftShare.yaml
# flatpak-builder --user --install --force-clean flatpak app.riftshare.RiftShare.yaml
wails build
cd ..
tar -czvf riftshare-vendored.tar.gz riftshare