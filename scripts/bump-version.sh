#!/bin/bash

echo $PWD
sed -i '' s/$1/$2/g ./build/darwin/Info.plist
sed -i '' s/$1/$2/g ./internal/update/selfupdate.go
sed -i '' s/$1\.0/$2\.0/g ./build/windows/appxmanifest.xml
sed -i '' s/$1\.0/$2\.0/g ./build/windows/RiftShare.exe.manifest