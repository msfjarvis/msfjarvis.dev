---
title: Using containers in NixOS
date: 2023-12-05T05:40:53.004Z
summary: NixOS allows running arbitrary Docker containers declaratively, these
  are some of my notes on my usage of this functionality.
draft: true
---
`podman containers list` works only if you're root, not with `sudo podman containers list`.