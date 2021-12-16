## RiftShare

Easy, Secure, and Free file sharing for everyone. 

<a href="https://github.com/achhabra2/riftshare/releases/latest" target="_blank" align="center">
<img src="https://github.com/achhabra2/riftshare/blob/main/appicon.png?raw=true" alt="icon" width="128" />
</a>

### Installation & Compatibility

UPDATE: RiftShare now provides signed and notarized MacOS releases, if there is enough demand I can look into signing the windows release as well. 

Download the [latest release](https://github.com/achhabra2/riftshare/releases/latest) for your operating system. 

Riftshare is compatible with the following operating systems:

* [Windows (x64)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-windows-amd64.zip)
* [MacOS (Intel)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-darwin-amd64.zip)
* [MacOS (M1)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-darwin-arm64.zip)
* Linux (Coming Soon)

### Features

* Easy secure file sharing between computers both in the local network and through the internet
* Supports sending files or directories securely through the [magic wormhole protocol](https://magic-wormhole.readthedocs.io/en/latest/)
* Compatible with all other apps using magic wormhole (magic-wormhole or wormhole-william CLI, wormhole-gui, etc.)
* Automatic zipping of multiple selected files to send at once
* Full animations, progress bar, and cancellation support for sending and receiving
* Native OS File Selection
* Open files in one click once received
* Auto Update - don't worry about having the latest release!

### How to Use

#### Sending Files
<img src="https://raw.githubusercontent.com/achhabra2/riftshare/gh-pages/send.gif" alt="send" width="600" align="center"/>

#### Receiving Files
<img src="https://raw.githubusercontent.com/achhabra2/riftshare/gh-pages/receive.gif" alt="send" width="600" align="center"/>

### Attributions

This project was inspired by [wormhole-gui](https://github.com/Jacalz/wormhole-gui). 

Built leveraging the following Go Modules:
* [Wails-v2](https://wails.io)
* [wormhole-william](https://github.com/psanford/wormhole-william)
* [compress](https://github.com/klauspost/compress)
* [go-github-selfupdate](https://github.com/rhysd/go-github-selfupdate)
* [beeep](https://github.com/gen2brain/beeep)

Frontend UI Built Using:
* [Svelte](https://svelte.dev)
* [TailwindCSS](https://tailwindcss.com)
* [FontAwesome](https://fontawesome.com)

### License

RiftShare is Licensed under the GNU General Public License v3.0

### Privacy Policy

RiftShare does not collect, store, or persist any user data. 
