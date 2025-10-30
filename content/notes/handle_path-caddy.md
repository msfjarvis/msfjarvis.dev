+++
title = "`handle_path` in Caddy"
date = 2025-06-30T20:01:25Z
tags = ["Caddy"]
+++

Caddy has a `handle_path` directive that you can use to host services that don't like being hosted on paths, it will strip the prefix for the underlying service so it sees just the root domain
