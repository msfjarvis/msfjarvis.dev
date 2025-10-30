+++
title = "Interactive reverts in Git"
date = 2025-09-23T21:53:23Z
tags = ["Git"]
+++

Git has the capability to revert only specific hunks of a commit using the `git checkout --patch` command. To revert the changes to file `example.md` made in commit `0xDEADBEEF`, you would run `git checkout --patch 0xDEADBEEF^ example.md` and Git will open up the interactive diff editor so you can select which reverts you want to apply to your index.
