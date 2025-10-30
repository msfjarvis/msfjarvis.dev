+++
title = "Updating Fixed Output Derivations in Nix packages"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

Nix vendors Golang dependencies in a fixed-output derivation (FOD) which will give confusing errors if the contents change but you don't update the hash or name. Concrete example: refreshing the `update-tailscale.patch` file for `caddy-tailscale` will fail with mysterious "this module is using a different version" until you change either `pname` or `vendorHash` to force a rebuild of the FOD and reveal any real errors.
