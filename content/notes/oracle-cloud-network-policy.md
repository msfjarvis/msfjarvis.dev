+++
title = "Oracle Cloud's restrictive default network policy"
date = 2025-09-16T01:30:40Z
tags = ["Oracle", "Tailscale"]
+++

Oracle cloud doesn't enable any ports other than SSH by default, which somehow doesn't affect any Tailscale services but breaks the ability to negotiate a TLS certificate over ports 80 and 443.
