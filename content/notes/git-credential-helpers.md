+++
title = "Git credential helpers"
date = 2025-06-30T20:01:25Z
tags = ["Git"]
+++

Git credential helpers work via writing and reading from standard input and standard output which helped me debug an issue I was having with [pass-git-helper](https://github.com/languitar/pass-git-helper). To get a credential helper to spit out the password, invoke it with the `get` action and pass in some basic `key=value` data. The interaction looks somewhat like given below, with `<` indicating the standard input of the credential helper and `>` indicating its standard output.

```
# for URL https://git.msfjarvis.dev/msfjarvis/pass-store
$ pass-git-helper get
< protocol=https
< host=git.msfjarvis.dev
< path=msfjarvis/pass-store
> protocol=https
> host=git.msfjarvis.dev
> username=msfjarvis
> password=hunter2
```
