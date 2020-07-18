+++
title = "Uses"
type = "standalone"
layout = "standalone"
+++

## Editor + Terminal

I use the `gnome-terminal` that ships with Linux Mint's Cinnamon Edition with `bash` and a custom prompt from [starship](https://starship.rs). The editor I use depends on what code I am working with:

- Web, Python: VS Code
- Rust: VS Code or CLion
- Android: Android Studio
- Kotlin (outside Android): IntelliJ IDEA

I also tend to use [nano](https://www.nano-editor.org/) for quick edits on the terminal. Fight me.

### CLI tooling

My love for Rust extends deep into the CLI, and a lot of GNU tools are replaced with their Rust reimplementations for better performance and useful features. Notably, the replacements are:

| GNU version | Rust version | Link                                            |
| ----------- | ------------ | ----------------------------------------------- |
| `cat`       | `bat`        | [GitHub](https://github.com/sharkdp/bat)        |
| `cd`        | `zoxide`     | [GitHub](https://github.com/ajeetdsouza/zoxide) |
| `du`        | `diskus`     | [GitHub](https://github.com/sharkdp/diskus)     |
| `find`      | `fd`         | [GitHub](https://github.com/sharkdp/fd)         |
| `grep`      | `ripgrep`    | [GitHub](https://github.com/BurntSushi/ripgrep) |

~~I have begun using [Homebrew](https://brew.sh) to maintain software on my machines so you can see most stuff I have on my PC in this [Brewfile](https://github.com/msfjarvis/dotfiles/blob/master/homebrew/Brewfile).~~ I now officially despise Homebrew, and use [Nix](https://nixos.org/nix/) instead. Yes, I'm fickle, how'd you guess?

## Hardware

### PC

- CPU: Ryzen 5 1600 (6c/12t) @ 3.2 GHz
- GPU: Nvidia GeForce GT 710
- RAM: 8 + 8 (Kingston Value DDR4) + 16 (Kingston HyperX)
- Motherboard: ASRock A320M Pro4

### Laptop

Lenovo IdeaPad 330-15ARR with a Ryzen 3 2200U CPU and Vega 3 graphics.

### Phones

- 128GB Google Pixel 2 running the latest stable release or developer preview of Android depending on what's newer
- 64 GB Samsung M30s running OneUI 2.0 based on Android 10
