+++
title = "Using your IDE as the Git commit message editor"
date = 2025-06-30T20:01:25Z
tags = ["Git"]
+++

Git has a [`GIT_EDITOR` variable](https://git-scm.com/docs/git-var#Documentation/git-var.txt-GITEDITOR) that can be overridden in specific contexts to change the editor used by Git for rebase/commit etc.

I've configured Zed to use itself as my commit editor from the integrated terminal, which makes for a nicer experience in the IDE than having to use the terminal text editor.
