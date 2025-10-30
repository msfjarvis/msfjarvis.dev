+++
title = "Building derivations in the Nix REPL"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

In a Nix REPL you can run `:bl inputs.nixpkgs.legacyPackages.aarch64-linux.pkgs.attic-server` to build the derivation and create a `result` link. Can also run `:bl nixosConfigurations.ryzenbox.pkgs.attic-client`.
