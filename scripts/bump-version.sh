#!/bin/bash

echo "Bumping version from ${1} to ${2}"
echo "Replacing version in Info.plist"
sed -i '' s/$1/$2/g ./build/darwin/Info.plist
echo "Replacing version in selfupdate.go"
sed -i '' s/$1/$2/g ./internal/update/selfupdate.go
echo "Replacing version in appxmanifest.xml"
sed -i '' s/$1\.0/$2\.0/g ./build/windows/appxmanifest.xml
echo "Replacing version in RiftShare.exe.manifest"
sed -i '' s/$1\.0/$2\.0/g ./build/windows/RiftShare.exe.manifest