+++
title = "TIL: Bypassing aliases in a Bash script"
date = "2025-12-07T13:41:00+05:30"
lastmod = "2025-12-07T13:41:00+05:30"
summary = "Quick syntactic solution for ensuring aliases don't mess up scripts"
tags = [ "bash", "sysadmin" ]
draft = false
+++
On all my machines I have `cat` aliased to [bat](https://github.com/sharkdp/bat) which prints text with nice formatting and layout. This can sometimes trip up scripts if `bat` doesn't correctly detect it is being used in a pipe and still outputs all the nice formatting instead of the plain text. To bypass this in your scripts, you can replace uses of `cat file_name` with `\cat file_name` to always get the `cat` program in your `$PATH` instead of an alias. This also works with `"cat" file_name`.
