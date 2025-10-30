+++
title = "Tailscale ACL grants"
date = 2025-06-30T20:01:25Z
tags = ["Tailscale", "Caddy", "Firefly-iii"]
+++

Services being routed by [caddy-tailscale](https://github.com/tailscale/caddy-tailscale) are treated as full-fledged Tailscale nodes and thus follow the ACL policies of deny-by-default. If I want to be able to ping a Tailscale address from the server I will have to add an ACL grant allowing the server's tag to access the tag applied to the service. This was necessary today for the Firefly-iii data importer to be able to access the Firefly-iii instance running on the same server.
