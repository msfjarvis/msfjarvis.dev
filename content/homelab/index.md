+++
title = "Homelab"
type = "page"
lastmod = "2025-05-02T03:17:00+05:30"
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
Memory: 32 GiB
```

## ThinkStation P330 (matara)

```
Host: 30D0S0LS00 (ThinkStation P330)
CPU: Intel(R) Core(TM) i3-8100 (4) @ 3.60 GHz
GPU: Intel UHD Graphics 630 @ 1.10 GHz [Integrated]
Memory: 16 GiB
```

## Oracle ARM server (melody)

```
Host: KVM Virtual Machine (virt-7.2)
CPU: Neoverse-N1*4 (4)
GPU: RedHat Virtio 1.0 GPU
Memory: 24 GiB
```

## Netcup.de ARM server (wailord)

```
Host: KVM Server VPS 1000 ARM G11
CPU: (6)
GPU: Red Hat, Inc. Virtio 1.0 GPU
Memory: 8 GiB
```

# Deployment

All these machines run NixOS unstable, and are updated every weekend. The configurations are fully open source and can be found in my [dotfiles](https://github.com/msfjarvis/dotfiles) repo. wailord utilizes melody as a remote builder for the weekly updates, everything else builds for itself.

# Networking

ryzenbox and crusty are both on my home network and can access each other over LAN, while wailord is hosted in the EU and has to be accessed over the Internet. All machines are hooked up to Tailscale and their SSH ACL grants set up one-way SSH access from ryzenbox to crusty and wailord.

# Services

**wailord** bears the brunt of my self-hosting escapades and hosts basically everything that is accessible over the Internet. The _public_ services running on it are listed below:

- [Betula](https://betula.mycorrhiza.wiki/) at [https://links.msfjarvis.dev](https://links.msfjarvis.dev) as my primary bookmark manager.
- [Gitea](https://gitea.com) at [https://git.msfjarvis.dev/](https://git.msfjarvis.dev/) as a backup Git host which mirrors my GitHub repositories.
- [Miniflux](https://miniflux.app) at [https://read.msfjarvis.dev](https://read.msfjarvis.dev) to function as my RSS reader.
- [Vaultwarden](https://www.vaultwarden.net/) at [https://vault.msfjarvis.dev](https://vault.msfjarvis.dev) is the password manager I run for me and (as of recently) my family.
