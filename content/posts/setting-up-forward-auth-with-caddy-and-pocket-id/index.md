+++
title = "Setting up forward auth with Caddy and Pocket ID"
date = "2026-03-18T14:17:00+05:30"
lastmod = "2026-03-18T14:17:00+05:30"
summary = "Using Pocket ID to secure services being proxied by Caddy"
categories = [ "devops", "homelab" ]
tags = [ "caddy", "pocket-id", "forward auth", "security", "reverse proxy", "nixos" ]
draft = true
+++

As I mentioned in my [last weeknote](/posts/weeknotes-week-11-2026/), I set up [Calibre-Web](https://github.com/janeczku/calibre-web) last week which necessitated the use of a forward authentication setup to work with my existing SSO provider. It was rather non-trivial to get it all to work, so I'm documenting it here in hopes of helping others.

## Requirements
- [Caddy](https://caddyserver.com/) with the [caddy-security](https://github.com/greenpau/caddy-security/) plugin
- [Pocket ID](https://pocket-id.org/)
- Patience.

## Pocket ID setup

Follow the Caddy guide [here](https://pocket-id.org/docs/guides/proxy-services) to set up an OIDC client and the caddy-security configuration in your Caddyfile. This gets you 90% of the way, but due to recent regressions in caddy-security you'll need to make some tweaks.

First of all, in the `oauth identity provider` block, add this line:
```
trust login redirect uri domain exact ${app.domain} path prefix /
```
Replace `${app.domain}` with the domain to the service you are securing.

The guide also assumes you will re-use the same caddy-security authentication portal for all your services which is _fine_, but I prefer to have each OIDC client be isolated on a service level instead of just having a generic caddy-security one so I had to get somewhat creative with it. I'll explain the basic changes first then dive into the NixOS-specific stuff I did for my own deployment.
