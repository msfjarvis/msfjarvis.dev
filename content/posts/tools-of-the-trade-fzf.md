+++
categories = ["tools-of-the-trade"]
date = 2020-08-10
description = "Continuing this series, let's talk about fzf."
draft = true
slug = "tools-of-the-trade-fzf"
socialImage = "/uploads/tools-of-the-trade-fzf.webp"
tags = ["fzf", "cli-tools", "tools-of-the-trade"]
title = "Tools of the trade: fzf"
+++

In this second post, let's talk about [fzf](https://github.com/junegunn/fzf).

# What is fzf?

In its simplest form, `fzf` is a **f**u**zz**y **f**inder. It lets you search through files, folders, any line-based text using a simple fuzzy and/or regex backed system.

Usage can be very straightforward: just type `fzf`.

{{< asciinema zlWZPYualoELZxruMRIln9eZw >}}

By default, `fzf` is a full-screen tool and takes up the entire height of your terminal. I've restricted it to 40% of that, as it looks a bit nicer IMO. You can make more such changes by setting the `FZF_DEFAULT_OPTS` environment variable as described in the [layout section](https://github.com/junegunn/fzf#layout) of the fzf docs.
