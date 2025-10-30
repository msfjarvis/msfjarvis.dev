+++
title = "Using Tailscale exit nodes on NixOS"
date = 2025-06-30T20:01:25Z
tags = ["Tailscale", "NixOS"]
+++

Tailscale on NixOS requires setting `services.tailscale.useRoutingFeatures = "client"` on the non-exit-node machines to allow routing to work.
