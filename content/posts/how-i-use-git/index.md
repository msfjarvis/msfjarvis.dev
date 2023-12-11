+++
categories = ["git"]
date = 2021-08-14
summary = "Everyone uses Git their way. This is how I do it."
draft = true
slug = "how-i-use-git"
tags = ["developer workflow"]
title = "How I use Git"
+++

Every developer ends up using Git in some way or another these days, whether through the good old CLI or various Git GUI clients or the integrated options in their favorite IDEs. Because there are a myriad ways to use Git, and practically infinite extensibility, everyone internalizes patterns around how they work with Git. A favorite way of merging, a preferred pull strategy, a bunch of shell aliases to save keystrokes, and so on and so forth.

Over time I have also developed habits and patterns, augmented by features present within Git itself as well as external tools that integrate with Git.

This post is going to be a overview of the tools I use with Git, and by extension GitHub, to make my daily workflow more productive.

## `.gitconfig`

The `.gitconfig` file is essentially the backbone of Git customisation. Any Git-specific setting will reside in one of these config files.

> I say _files_, because Git includes a hierarchy of how Git settings take effect. Within a repository, settings are first looked up in `.git/config`, and then in `$HOME/.gitconfig` which allows having per-repository settings as necessary.

My `.gitconfig` file can be found in my dotfiles [here][1]. Most of the settings keys are self-explanatory, the rest I'll go over below.

- `core.pager` / `interactive.difffilter` switch my `git diff` and `git add --patch` views to use [diff-so-fancy][2].

![diff-so-fancy rendering the diff of a commit][3]

- `pretty.fixes` adds a ['pretty'][10] format called `fixes` which lists commits in the style that is used by the Linux kernel developers to link to the commits which introduced the bug they're fixing in their current commit. It adds a chain of historical reference to identify common bug patterns that are repeatedly occurring, which can then allow teams to devise ways of avoiding them.

```
➜ git log --pretty=fixes
Fixes: 689a369a3a3d ("Upgrade ConstraintLayout, Material and Timber (#1484)")
Fixes: a82f8dda8607 ("Disable explicit API for tests (#1483)")
Fixes: 70137f31917b ("gradle: switch to our fork of preference testing library (#1481)")
Fixes: 1738364d2fdb ("Make password generator parameter changes reactive (#1480)")
```

- `alias.branches` defines a subcommand that lists all remote branches in order of their last updates. This provides an easy overview of the status of your project's branches.

```
➜ git branches
 70 minutes ago	fork/develop
 70 minutes ago	origin/HEAD
 70 minutes ago	origin/develop
 3 days ago	origin/release-1.13
 5 days ago	origin/compose-decrypt-screen
 12 days ago	fork/migrate-to-kotest
 2 weeks ago	origin/import-keys
 4 weeks ago	fork/storage-refactor
 8 months ago	origin/api_30_support
 10 months ago	origin/release
```

From this overview you can see that the `develop` branch of my fork is synced with the main APS repo, a release was made 3 days ago, and I was trying out Jetpack Compose 5 days ago for one of the app's screens.

- `log.follow` will track files through renames, relying on Git's [in-built rename detection][11] that it also uses for `git cherry-pick` and `git merge`.

```
# Without `log.follow`
➜ git log --stat 3.txt
commit 4f7bfdf35c1e544b1858e40fabfb26e33a91fde0 (HEAD -> main)
...
 3.txt | 0
 1 file changed, 0 insertions(+), 0 deletions(-)

# With `log.follow`
➜ git log --stat 3.txt
commit 4f7bfdf35c1e544b1858e40fabfb26e33a91fde0 (HEAD -> main)
...
 2.txt => 3.txt | 0
 1 file changed, 0 insertions(+), 0 deletions(-)

commit 62a050ddbbad87a0a8317db55dc1121679818825
...
 1.txt => 2.txt | 0
 1 file changed, 0 insertions(+), 0 deletions(-)

commit 005e734a0018b2e8415d2be051c4e2b18e5feee3
...
 1.txt | 1 +
 1 file changed, 1 insertion(+)
```

## `hub`

Before GitHub had the [GitHub CLI][4], it had [hub][5]. `hub` wraps `git` and adds a bunch of extra niceties on top such as being able to do `git clone <repo>` to clone any of your own repositories. The one that I still use though, is `hub sync`, which fast-forwards all local checkouts of remote branches to the latest state on the remote.

{{< asciinema oHZZ68hPpZdcTmiyI9n9k2XRF >}}

## `git-absorb`

[`git-absorb`][6] is a Git extension that mimics Mercurial's [`hg absorb`][7] extension, which inspects the currently staged changes and tries to look through your recent commits to determine which of them should your changes be amended to. More information on this can be found [here][8]

// Add asciinema recording

## git-quickfix

[`git-quickfix`][9] is another Git extension, which allows moving commits to a new branch quickly. The most common use case for it is this: Imagine you're working on a feature branch, and notice a small problem that is unrelated to your current branch. `git-quickfix` would allow you to make a commit on your current branch, then _move it to a new branch_ in just one command.

// Add asciinema recording

## `gh`

[`gh`][4] is GitHub's very own CLI for interacting with their platform. Since my day-to-day work revolves around GitHub, `gh` is extremely helpful is being able to triage issues, raise PRs, view the status of CI jobs and much more. Definitely a must-have if you're a terminal fiend and use GitHub!

[1]: https://msfjarvis.dev/g/dotfiles
[2]: https://github.com/so-fancy/diff-so-fancy
[3]: ./uploads/diff-so-fancy-screenshot.webp
[4]: https://cli.github.com/
[5]: https://hub.github.com/
[6]: https://github.com/tummychow/git-absorb
[7]: https://www.mercurial-scm.org/wiki/Release4.8
[8]: https://gregoryszorc.com/blog/2018/11/05/absorbing-commit-changes-in-mercurial-4.8/
[9]: https://github.com/siedentop/git-quickfix
[10]: https://git-scm.com/docs/pretty-formats
[11]: https://git-scm.com/docs/gitdiffcore#_diffcore_rename_for_detecting_renames_and_copies
