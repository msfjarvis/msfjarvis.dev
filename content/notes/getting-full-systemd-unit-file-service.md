+++
title = "Getting the full systemd unit file for a service"
date = 2025-06-30T20:01:25Z
tags = ["systemd", "NixOS"]
+++

You can run `systemctl show servicename.service` to get the "final" version of your systemd service file, including all overrides which would typically be loaded dynamically by systemd itself and not visible in the actual unit file.

This is extremely helpful on NixOS where packages can sometimes re-use upstream systemd unit files and inject NixOS specific options through an override file.
