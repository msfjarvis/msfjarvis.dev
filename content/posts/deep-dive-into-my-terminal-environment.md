+++
categories = ["dev"]
date = 2020-07-30T15:59:47+05:30
description = ""
draft = true
slug = "deep-dive-into-my-terminal-environment"
tags = ["cli", "dev", "unix"]
title = "Deep dive into my terminal environment"
+++

A few days ago I ran a poll on Twitter to see if people would be interested in a deep dive into how my terminal environment is set up, and an overwhelming majority said yes, so here we are.

Starting with the basics, I use `gnome-terminal` as the terminal of choice. It themes well with the rest of the GTK apps, supports custom fonts, font size, and color schemes - all the basic stuff you'd want in a terminal. I'm sure there are better terminals out there, I just haven't felt the need for them.

My shell - `bash`. I've tried getting into ZSH, never got past initial setup and literally every shill had only two things to say: install `oh-my-zsh` and install `powerline10k`. Big nope. I'm not a huge fan of heavily themed prompts or tons of plugins that slow things down, and `zsh`'s completions are not interesting to me. `fish` comes up less often, but the prospect of having to rewrite all my scripts just to try it out is a tad too much work than I'm willing to put in.

My prompt - [`starship`](https://starship.rs). It works on all popular shells and platforms and is a decent combination of form and function. My only gripe with it is that in directories with a lot of files (say, a linux kernel tree), the prompt is [orders of magnitude slower](https://github.com/starship/starship/issues/1469) than just having a 'dumb' `bash` prompt.
