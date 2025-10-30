+++
title = "Type='oneshot' services block systemctl CLI"
date = 2025-06-30T20:01:25Z
tags = ["systemd", "NixOS"]
+++

Systemd runs all units that specify `Type=oneshot` to completion in a blocking manner which is what causes my NixOS configuration switching to sometimes get stuck with a long-running task. The solution is to use `Type=simple` and instead configure the restart policy to not fire unnecessarily.
