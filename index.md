---
title: Home
subtitle: Easy, Secure, and Free file sharing for everyone.
nav_order: 1
---
<div class="d-flex v-align-middle" style="justify-content: center;">
  <img src="/assets/riftshare_small.png" alt="icon" width="192" />
  <div class="v-align-middle">
    <h1>RiftShare</h1>
    <p>Easy, Secure, and Free file sharing for everyone.</p>
    <div>
      <a href="https://apps.apple.com/us/app/riftshare/id1602642908" target="_blank" align="center">
        <img src="/assets/mac_app_store.svg" alt="icon" width="128" />
      </a>
      <a href="https://www.microsoft.com/store/apps/9P564W951H6N" target="_blank" align="center">
        <img src="/assets/ms_app_store.svg" alt="icon" width="128" />
      </a>
    </div>
  </div>
</div>
<p align="center" style="text-align: center">
</p>
<p align="center">
<a href="https://github.com/achhabra2/riftshare/blob/main/LICENSE"><img alt="GitHub license" src="https://img.shields.io/github/license/achhabra2/riftshare"></a>
<img alt="GitHub Release Date" src="https://img.shields.io/github/release-date/achhabra2/riftshare">
<img alt="GitHub release (latest SemVer)" src="https://img.shields.io/github/v/release/achhabra2/riftshare">
<!-- Place this tag where you want the button to render. -->
<a class="github-button" href="https://github.com/achhabra2/riftshare" data-icon="octicon-star" aria-label="Star achhabra2/riftshare on GitHub">Star</a>
</p>

The purpose of this project is to enable everyone to be able to share files privately in real time, without the use of the major tech companies and cloud providers. Use RiftShare to send files to your friends and family, or even between computers at your house. It is shocking how over the years, sharing files is still more complicated than it needs to be. Look no further. No accounts, sign-ups, or tracking, just a simple human-readable passphrase.

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

### Installation & Compatibility

```
UPDATE 12/27/21: RiftShare now provides code signed and notarized MacOS releases, 
if there is enough demand I will code sign the Windows release as well to get through
the security warning.

UPDATE 01/04/22: RiftShare is now available on the Mac and Windows App stores
for easy and seamless install. Builds are still available from GitHub below.
```

Download the [latest release](https://github.com/achhabra2/riftshare/releases/latest) for your operating system.

Riftshare is compatible with the following operating systems:

- [Windows (x64)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-windows-amd64.zip)
- [MacOS (Intel)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-darwin-amd64.zip)
- [MacOS (M1)](https://github.com/achhabra2/riftshare/releases/latest/download/RiftShare-darwin-arm64.zip)
- Linux (Coming Soon)

### Features

- Easy secure file sharing between computers both in the local network and through the internet
- Supports sending files or directories securely through the [magic wormhole protocol](https://magic-wormhole.readthedocs.io/en/latest/)
- Compatible with all other apps using magic wormhole (magic-wormhole or wormhole-william CLI, wormhole-gui, etc.)
- Automatic zipping of multiple selected files to send at once
- Full animations and progress bar for sending and receiving
- Native OS File Selection
- Open files in one click once received
- Auto Update - don't worry about having the latest release!

### How to Use

View the following anitmated gifs on how to send and receive files. In essence - you select a file and click send, a code will be generated. Put that code into the receiving end and hit download. As simple as that. 

#### Sending Files 
{: .text-center}

<p align="center" style="text-align: center">
<img src="https://raw.githubusercontent.com/achhabra2/riftshare/gh-pages/send.gif" alt="send" width="480" align="center"/>
</p>

#### Receiving Files
{: .text-center}

<p align="center" style="text-align: center">
<img src="https://raw.githubusercontent.com/achhabra2/riftshare/gh-pages/receive.gif" alt="send" width="480" align="center"/>
</p>

### Attributions

This project was inspired by [wormhole-gui](https://github.com/Jacalz/wormhole-gui).

Built leveraging the following Go Modules:

- [Wails-v2](https://wails.io)
- [wormhole-william](https://github.com/psanford/wormhole-william)
- [compress](https://github.com/klauspost/compress)
- [go-github-selfupdate](https://github.com/rhysd/go-github-selfupdate)
- [beeep](https://github.com/gen2brain/beeep)

Frontend UI Built Using:

- [Svelte](https://svelte.dev)
- [TailwindCSS](https://tailwindcss.com)
- [FontAwesome](https://fontawesome.com)

### License

RiftShare is Licensed under the GNU General Public License v3.0

### Privacy Policy

RiftShare does not collect or store any personal information. Read more <a href="/privacy.html">here</a>.

### FAQ

Please view the <a href="/faq.html">FAQ Page</a>.
