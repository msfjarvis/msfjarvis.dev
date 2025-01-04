+++
title = "Assorted Git things"
date = 2024-10-01T13:57:00.000+05:30
lastmod = 2024-12-29T19:47:00.000
summary = "A running log of Git concepts I've learned since I started journaling"
categories = [ "dev" ]
tags = [ "git" ]
draft = false
+++

When I asked for suggestions about note-taking apps [back in May](https://androiddev.social/@msfjarvis/112378523734491769) I wasn't fully convinced I'd be able to stick with it, but nearly 6 months later it has probably been the thing I've been most consistent about. Anyways, here's a rather short list of Git things off the ['TIL'](https://dictionary.cambridge.org/us/dictionary/english/til) list in my Logseq graph. I'll keep adding new things to the top as they come up.

# GIT_EDITOR variable

While Git will usually pick the `$EDITOR` environment variable to present an edit UI for commit messages and rebase to-dos, it also supports [its own `$GIT_EDITOR`](https://git-scm.com/docs/git-var#Documentation/git-var.txt-GITEDITOR) variable that can be used to set a Git-specific editor. This functionality can be leveraged from integrated terminals inside IDEs to allow writing commit message from the IDE without having to use their entire Git UI.

# `git add`

- `git add -u` will stage changes to all tracked files and leave untracked ones alone.
- `git add -N` will stage a file without any of its changes. You can treat that as an "intention" to create a file as well as making it easier to use `git diff` to see what is being added without needing the `--cached` flag every time.

# Git submodules

Probably the biggest pain in the ass in all of Git land. Every time I've had to use a submodule, I've disliked the experience. Here's how to _properly_ get rid of a submodule in case you're switching to [git-subrepo](https://github.com/ingydotnet/git-subrepo) or a different solution.

```plain
git submodule deinit -f path/to/module
rm -rf .git/modules/path/to/module
git config -f .gitmodules --remove-section submodule.path/to/module
git add .gitmodules
git rm --cached path/to/module
```

In order, this

1. [`deinit`](https://git-scm.com/docs/git-submodule#Documentation/git-submodule.txt-deinit-f--force--all--ltpathgt82308203) removes the checkout of the submodule and removes it from `.git/config`
2. Deletes the bare repository Git creates of the submodule which is used to generate the actual checkout
3. Edits your `.gitmodules` file to remove the submodule entry
4. Stages the changes to `.gitmodules`
5. Deletes the submodule fully from the index

At this point you can commit the changes and hopefully never deal with a submodule again :D

# Git credential helpers

While trying to configure [pass-git-helper](https://github.com/languitar/pass-git-helper) to authenticate with my [personal Git forge](https://git.msfjarvis.dev/explore/repos) I ended up learning a bit about how Git interacts with credential helpers

Git credential helpers work via writing and reading from stdin and stdout which helped me debug an issue I was having with pass-git-helper. To get a credential helper to spit out the password, it needs to be called with `get` as the first argument and pass in some basic key=value data. The interaction looks somewhat like given below, with `<` indicating the stdin of the credential helper and `>` indicating its stdout.

```plain
# for URL https://git.msfjarvis.dev/msfjarvis/super-private
$ pass-git-helper get
< protocol=https
< host=git.msfjarvis.dev
< path=msfjarvis/super-private
> protocol=https
> host=git.msfjarvis.dev
> username=msfjarvis
> password=hunter2
```
