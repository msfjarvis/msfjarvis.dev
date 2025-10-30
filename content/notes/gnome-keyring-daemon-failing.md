+++
title = "GNOME keyring daemon failing with 'No such secret item at path'"
date = 2025-06-30T20:01:25Z
tags = ["GNOME", "NixOS"]
+++

After a GNOME related NixOS rebuild sometimes the secret store starts erroring out with this message: `No such secret item at path: /org/freedesktop/secrets/collection/login/145`

This is resolved by restarting the gnome-keyring-daemon using the command `gnome-keyring-daemon -r -d`.
