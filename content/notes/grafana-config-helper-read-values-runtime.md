+++
title = "Grafana config helper to read values at runtime"
date = 2025-08-27T22:12:03Z
tags = ["Grafana"]
+++

Grafana has a helper in its config files called `$__file{/path/to/file}` that will read the file at runtime, making it easier to configure secrets via Nix.
