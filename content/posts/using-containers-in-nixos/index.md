---
title: Using containers in NixOS
date: 2023-12-08T11:27:39.010Z
summary: NixOS allows running arbitrary Docker containers declaratively, these
  are some of my notes on my usage of this functionality.
draft: true
---

NixOS comes with the ability to [declaratively manage docker containers](https://nixos.wiki/wiki/NixOS_Containers#Declarative_docker_containers), which functions as a nice escape hatch when something you want to run doesn't have a native Nix package or is not easy to run within NixOS.

All the available configuration options can be found [here](https://search.nixos.org/options?channel=unstable&from=0&size=50&sort=alpha_desc&query=virtualisation.oci-containers.containers), so rather than explain all of it I'll just walk through my own experience of getting a container up for [Linkding](https://github.com/sissbruecker/linkding).

`podman containers list` works only if you're root, not with `sudo podman containers list`.
