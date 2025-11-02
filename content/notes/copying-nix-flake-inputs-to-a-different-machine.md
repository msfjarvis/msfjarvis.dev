+++
title = "Copying Nix Flake inputs to a different machine"
date = "2025-11-02T15:18:00+05:30"
lastmod = "2025-11-02T15:18:00+05:30"
summary = "Simple one-liner to avoid re-downloading inputs on a different machine on your LAN"
tags = [ "NixOS", "Nix" ]
draft = false
+++
> TL;DR: `nix flake archive --json | jq -r '.inputs[].path' | xargs nix --verbose copy --to ssh://user@host`

Due to unfortunate circumstances my homelab server is running on a relatively slow internet connection while I'm at home. To alleviate the problems this causes with NixOS updates, I build and deploy the new generations for it from my desktop. This works in most cases, except when an update ends up restarting Tailscale or OpenSSH which cuts off my SSH session and leaves the machine in a bad state.

As a workaround for _that_ problem I now copy the built closure to the Nix Store of the machine and do an `nh os switch` inside a tmux session there so it can run to completion without having to download everything. This usually works, but it does need to redownload inputs which seems a little wasteful so I searched around for ways to get the Nix Store paths of all my Flake inputs and came up with this small solution that lets me skip even more network I/O for the homelab.
