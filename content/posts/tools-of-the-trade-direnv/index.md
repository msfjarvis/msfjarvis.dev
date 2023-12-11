+++
categories = ["tools-of-the-trade"]
date = 2020-08-04
summary = "In the first post in the new 'Tools of the trade' series, we talk about direnv."
slug = "tools-of-the-trade-direnv"
socialImage = "uploads/tools-of-the-trade-direnv.webp"
tags = ["direnv", "cli-tools"]
title = "Tools of the trade: direnv"
+++

This post was supposed to be a monolith directory of all the CLI-based tooling that I use to get things done throughout my day, but it turned out to be just a bit too long so I elected to split it out into separate posts.

Let's talk about [direnv](https://github.com/direnv/direnv).

## What is direnv?

On the face of it, it's not very interesting. Their GitHub description simply reads 'Unclutter your .profile', which gives you a general idea of what to expect but also grossly undersells it.

What direnv does, is improve the experience with things like [12 factor apps](https://en.wikipedia.org/wiki/Twelve-Factor_App_methodology). It enables per-directory configurations that would otherwise be 'global'. Let's look into how I use it, to get a robust idea of what you can expect.

## Why do I use it?

I have a separate account for proprietary work related things [here](https://github.com/hshandilya-navana), which means that any GitHub tooling I use now needs to be configured with separate credentials for when I'm interacting with work repositories. Bummer!

`direnv` makes this simpler by allowing for environment variables to be set for those repositories only. I mostly use the official GitHub CLI from [here](https://github.com/cli/cli) to interact with the remote repo, so providing a separate GitHub token is just a matter of setting the `GITHUB_TOKEN` environment variable to one that is allowed to interact with the current repo. With direnv, all you need to do is create a `.envrc` file in the repository directory with this:

```bash
export GITHUB_TOKEN=<redacted>
```

and `direnv` will automatically set it when you enter the directory, and more importantly: **reset** it back to its previous value when you exit. This 'unloading' feature makes `direnv` extremely powerful.

{{< asciinema qMkuyVjPSkhNqO6Jo0eQnLiyt >}}

`direnv` also comes with a rich stdlib that lets you do far more than just export environment variables.

Setting up a Python virtualenv:

{{< asciinema irkZWRh00gFVIcH41BRcOvowm >}}

Stripping entries from `$PATH`:

{{< asciinema vbzolwrYnXzBFvhAqMJEFBNRv >}}

Adding entries into `$PATH`:

{{< asciinema C1EhhAoy1y3vSwJaIc0R8o0RY >}}

> You'll notice an unfamiliar `rg -c` command there, it's [ripgrep](https://github.com/BurntSushi/ripgrep), and the `-c` flag counts the number of matches in the string if there are any, and nothing otherwise. We'll talk about it later in this series :)

The possibilities are huge! To check out the stdlib yourself, run `direnv stdlib` after installing `direnv`.

This was part 1 of the [Tools of the trade](/categories/tools-of-the-trade/) series.
