+++
title = "`lib.catAttrs` in Nixpkgs"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

In Nix it is possible to replace a call to `builtins.map` with `lib.catAttrs` if the transformation is just pulling out a field. For example: `builtins.map (item: item.field) list` can instead just be `catAttrs "field" list`.
