#! /bin/bash

wails build
rm build/bin/RiftShare
rm -rf frontend/node_modules
go mod vendor
cd ..
tar -czf riftshare-vendored.tar.gz riftshare
mv riftshare-vendored.tar.gz riftshare/