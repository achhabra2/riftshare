#! bin/bash
flatpak-builder flatpak app.riftshare.RiftShare.yaml
flatpak-builder --user --install --force-clean flatpak app.riftshare.RiftShare.yaml