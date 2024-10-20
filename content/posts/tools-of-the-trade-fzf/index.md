+++
categories = ["tools-of-the-trade"]
date = "2020-08-10T12:00:00+05:30"
lastmod = "2020-08-10T12:00:00+05:30"
slug = "tools-of-the-trade-fzf"
summary = "Continuing this series, let's talk about fzf."
tags = ["fzf", "cli-tools"]
title = "Tools of the trade: fzf"
+++

In the second post of [this series](/categories/tools-of-the-trade/), let's talk about [fzf](https://github.com/junegunn/fzf).

## What is fzf?

In its simplest form, `fzf` is a **f**u**zz**y **f**inder. It lets you search through files, folders, any line-based text using a simple fuzzy and/or regex backed system.

On-demand, `fzf` can also be super fancy.

## Why do I use it?

Because `fzf` is a search tool, you can use it to find files and folders. My most common use-case for it is a simple bash function that goes like this:

```bash
# find-and-open, gedit? Sorry I'll just stop.
function fao() {
  local ARG;
  ARG="${1}";
  if [ -z "${ARG}" ]; then
    nano "$(fzf)";
  else
    nano "$(fzf -q"${ARG}")";
  fi
}
```

It starts up a fzf session and then opens up the selected file in `nano`.

{{< asciinema gCwYg97C1NbRVgCUK0Dd1byVl >}}

By default, `fzf` is a full-screen tool and takes up the entire height of your terminal. I've restricted it to 40% of that, as it looks a bit nicer IMO. You can make more such changes by setting the `FZF_DEFAULT_OPTS` environment variable as described in the [layout section](https://github.com/junegunn/fzf#layout) of the fzf docs.

But that's not all! You can get _real_ fancy with `fzf`.

For example, check out the output of `fzf --preview 'bat --style=numbers --color=always --line-range :500 {}'` [here](https://asciinema.org/a/WFFx2negPw5iXbCZe1YlAZeqj) (a bit too wide to embed here :()

> `bat` is a `cat(1)` clone with syntax highlighting and other nifty features, and also a tool I use on the daily. We'll probably be covering it soon :)

You can also bind arbitrary keys to actions with relative ease.

{{< asciinema l7OPG4xQv5QVtvyxQfmly2eiE >}}

The syntax as evident, is pretty simple

```
<key-shortcut>:execute(<command>)<+abort>
```

The `+abort` there is optional, and signals `fzf` that we want to exit after running the command. Detailed instructions are available in the `fzf` [README](https://github.com/junegunn/fzf#readme).

And that's it from me. Post any fancy `fzf` recipes you come up with in the comments below!

This was part 2 of the [Tools of the trade](/categories/tools-of-the-trade/) series.
