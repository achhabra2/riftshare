#! bin/bash
# cd ./build/linux/
# flatpak-builder flatpak app.riftshare.RiftShare.yaml
# flatpak-builder --user --install --force-clean flatpak app.riftshare.RiftShare.yaml
wails build

tar -czvf RiftShare-linux-amd64.tar.gz \
    -C ./build/bin/ RiftShare \
    -C ../linux/ app.riftshare.RiftShare.desktop \
    app.riftshare.RiftShare.png
