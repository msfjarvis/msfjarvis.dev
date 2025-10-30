+++
title = "Initial setup for Nix remote builds"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

Nix remote builds are run through the daemon (obviously) so they are executed as root on the host delegating builds. To prevent issues, `nix store ping` needs to be run as root first to verify the host key before Nix can start using the remote host to do builds.
