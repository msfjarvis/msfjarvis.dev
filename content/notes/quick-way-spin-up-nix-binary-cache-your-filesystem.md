+++
title = "Quick way to spin up a Nix binary cache on your filesystem"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

Nixpkgs has a [`pkgs.mkBinaryCache`](https://nixos.org/manual/nixpkgs/unstable/#sec-pkgs-binary-cache) helper that lets you create a flat-file binary cache suitable for moving around without needing a server component.
