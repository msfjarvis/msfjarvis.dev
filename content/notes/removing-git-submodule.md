+++
title = "Removing a Git submodule"
date = 2025-06-30T20:01:25Z
tags = ["Git"]
+++

To remove a Git submodule go through these annoying steps:

```sh
git submodule deinit -f path/to/module
rm -rf .git/modules/path/to/module
git config -f .gitmodules --remove-section submodule.path/to/module
git add .gitmodules
git rm --cached path/to/module
```
