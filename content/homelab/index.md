+++
title = "Homelab"
type = "page"
lastmod = "2024-06-04"
ShowReadingTime = false
+++

This page aims to be a continuously updating record of my personal compute and the various services running on it. It will not always be in sync with reality, but I will make an attempt to update it every so often and the date it was last updated will always be at the top of this page.

# Hardware overview

## Desktop PC (ryzenbox)

```
Host: Gigabyte Technology Co., Ltd. B650M GAMING X AX
CPU: AMD Ryzen 9 7900X (24) @ 5.733GHz
GPU: AMD ATI Raphael
GPU: NVIDIA GeForce RTX 4070 Ti
Memory: 31234MiB
```

## Raspberry Pi 4B (crusty)

```
Host: Raspberry Pi 4 Model B Rev 1.5
CPU: (4) @ 1.500GHz
Memory: 7798MiB
```

## Netcup.de server (wailord)

```
Host: KVM Server VPS 1000 ARM G11
CPU: (6)
GPU: Red Hat, Inc. Virtio 1.0 GPU
Memory: 7909MiB
```

# Deployment

All these machines run NixOS unstable, and are updated every weekend. The configurations are fully open source and can be found in my [dotfiles](https://github.com/msfjarvis/dotfiles) repo. I use [deploy-rs](https://github.com/serokell/deploy-rs) to push out built configurations to crusty whose weak ass CPU can't really build its own NixOS configuration, and wailord usually does local builds.

# Networking

ryzenbox and crusty are both on my home network and can access each other over LAN, while wailord is hosted in the EU and has to be accessed over the Internet. All machines are hooked up to Tailscale and their SSH ACL grants set up one-way SSH access from ryzenbox to crusty and wailord.

# Services

**wailord** bears the brunt of my self-hosting escapades and hosts basically everything that is accessible over the Internet. The *public* services running on it are listed below:

- [Betula](https://betula.mycorrhiza.wiki/) at [https://links.msfjarvis.dev](https://links.msfjarvis.dev) as my primary bookmark manager
- [Gitea](https://gitea.com) at [https://git.msfjarvis.dev/](https://git.msfjarvis.dev/) as a backup Git host which mirrors my GitHub repositories
- [Miniflux](https://miniflux.app) at [https://read.msfjarvis.dev](https://read.msfjarvis.dev) to function as my RSS reader

**crusty** being the weak boy he is only runs QBittorrent on the internal Tailscale domain for completely legal torrenting :D

**ryzenbox** does not run much in the way of persistent services. It has a periodic systemd job running [gphotos-cdp](https://github.com/msfjarvis/gphotos-cdp) to back up my Google Photos library, and [Glance](https://github.com/glanceapp/glance) to be an informational pinned tab in my browser.
