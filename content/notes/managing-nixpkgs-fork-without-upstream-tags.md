+++
title = "Managing a Nixpkgs fork without upstream tags"
date = 2025-06-30T20:01:25Z
tags = ["Nixpkgs", "Git"]
+++

Enabling `fetch.pruneTags` causes my Nixpkgs Git checkout to constantly delete and fetch tags, since my fork is missing most tags that upstream has so they keep getting pruned when updating from `origin` and get re-created when fetching `upstream`.

One solution suggested for this was setting `remotes.<name>.tagOpt = "--no-tags"` but that didn't do the job for me.

The thing that worked for me was to conditionally disable `pruneTags` for just the `origin` remote so it would not try to clear out the tags pulled from `upstream`. Achieved by running `git config --local remotes.origin.pruneTags false`.
