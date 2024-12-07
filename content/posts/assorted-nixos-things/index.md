+++
title = "Assorted NixOS things"
date = "2024-12-07T20:19:48+05:30"
lastmod = "2024-12-07T20:19:48+05:30"
summary = "Running log of random things I've learned about Nix/NixOS/Nixpkgs"
categories = [ "dev" ]
tags = [ "Nix", "NixOS", "Nixpkgs" ]
+++

I run NixOS on my desktop and servers which results in coming across a bunch of generally random things, this is a running log of those discoveries which I'll attempt to keep up-to-date with my personal Logseq graph where I've kept the record of them.

# nix3-flake-metadata

The "new" (read: experimental) Nix CLI has a bunch of useful commands one of which is `nix flake metadata` that dumps a bunch of information about a flake, most notably, a tree-like representation of your inputs. It makes it significantly easier to find duplicate inputs and avoid the problem of ["1000 instances of Nixpkgs"](https://zimbatm.com/notes/1000-instances-of-nixpkgs). [nix-melt](https://github.com/nix-community/nix-melt) can also assist with this, though for this purpose I find the output from the Nix CLI to be easier to grok than navigating the nix-melt TUI.

# NixOS module system

The module system is behind a lot of what makes NixOS and Nixpkgs so powerful for composing reproducible systems. The nix.dev reference includes a [great tutorial](https://nix.dev/tutorials/module-system/index.html) that is a great read regardless of the complexity level of what you are trying to achieve.

# Updating your custom packages from a Git branch

> This isn't directly related to Nix itself but to [nix-update](https://github.com/mic92/nix-update) which is a very popular tool for keeping Nix packages up-to-date'

You can pass the `--version=branch` argument to update the package from the default branch instead of the latest tag/release for an Arch-style `-git` package. Specify `--version=branch=branch_name` if you want to use a non-default branch instead.

# The Nix language

It is possible to replace a call to `builtins.map` with `nixpkgs.lib.catAttrs` if the transformation is just pulling out a field. For example: `builtins.map (item: item.field) list` can instead just be `catAttrs "field" list`.

# Building packages from a REPL

In a Nix REPL you can run `:bl inputs.nixpkgs.legacyPackages.aarch64-linux.pkgs.attic-server` to build the derivation and create a `repl-result-out` symlink in your current working directory. You can also run `:bl nixosConfigurations.ryzenbox.pkgs.attic-client` if you wish to build the package from your NixOS configuration's instance of Nixpkgs.

# Avoiding mysterious errors with fixed-output derivations

For many languages Nixpkgs' builders vendor dependencies in a fixed-output derivation (FOD) which will give seemingly random errors if the contents change but its name doesn't, since the old copy of the FOD will continue to be used in the later build stages. For example, in a package using `buildGoModule`, updating the version but not changing the `vendorHash` will cause a new FOD to be created but the build will continue with the FOD of the previous version.

To avoid these problems when doing manual updates, make sure to change the relevant `cargoHash`/`vendorHash` to `lib.fakeHash` to cause the new FOD to be picked up which will also give you the correct hash to fill in the field.

# Tailscale exit nodes on NixOS

[Tailscale](https://tailscale.com) is a mesh VPN that includes a feature to run certain endpoints as [exit nodes](https://tailscale.com/kb/1103/exit-nodes), allowing traffic from other devices in the VPN to be routed from that machine.

On NixOS, the relevant firewall knobs for it are exposed under the [`services.tailscale.useRoutingFeatures`](https://search.nixos.org/options?channel=24.11&show=services.tailscale.useRoutingFeatures&from=0&size=50&sort=relevance&type=packages&query=services.tailscale.useRoutingFeatures) option which is required to run an exit node on a machine as well as allow a machine to use a different exit node. Set this to `server` if you want to run the specific machine as an exit node, and to `client` if you want it to be able to use exit nodes in your tailnet.

# Dual booting Windows using systemd-boot

NixOS includes options within its systemd-boot module that allow configuring boot entries for Windows without requiring manual intervention of copying over EFIs and what not. There are an initial few steps involved to get the relevant values, which are documented [in the option reference](https://search.nixos.org/options?channel=24.11&show=boot.loader.systemd-boot.windows&from=0&size=50&sort=relevance&type=packages&query=boot.loader.systemd-boot.windows).
