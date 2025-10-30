+++
title = "Staging a file in Git without its contents"
date = 2025-06-30T20:01:25Z
tags = ["Git"]
+++

`git add -N` will stage a file without any of its changes, you can treat that as an "intention" to add as well as allow diffing additions without needing `diff --cached`.
