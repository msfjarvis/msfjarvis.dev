+++
title = "Changing the locale set on a maching running Postgres"
date = 2025-10-29T18:30:11Z
tags = ["Postgres"]
+++

I keep rediscovering that Postgres uses the system locale and timezone database, despite [having read other people's woes](https://github.com/miniflux/v2/issues/3673).

I changed the locale in my NixOS configuration from en_US to en_GB to appease the spell checker on my desktop. When I deployed this updated configuration to one of my servers, all my services immediately fell over.

I had the sense to look at `journalctl` right away which made it very apparent what the problem was:

```
Oct 29 18:27:00 wailord postgres[3593]: [3593] FATAL:  database locale is incompatible with operating system
Oct 29 18:27:00 wailord postgres[3593]: [3593] DETAIL:  The database was initialized with LC_COLLATE "en_US.UTF-8",  which is not recognized by setlocale().
Oct 29 18:27:00 wailord postgres[3593]: [3593] HINT:  Recreate the database with another locale or install the missing locale.
```

(Yes my server is called [wailord](https://pokemondb.net/pokedex/wailord), I was loving [Cobblemon](https://cobblemon.com/en) when it was provisioned)

The solution was to simply add `en_US` back to [`i18n.supportedLocales`](https://github.com/NixOS/nixpkgs/blob/fc2ba10c4f0e1d4cda694e730769c563c2145745/nixos/modules/config/i18n.nix#L117) and a rebuild fixed everything right up.
