+++
categories = ["tools-of-the-trade"]
date = "2020-08-18T12:00:00+05:30"
lastmod = "2020-08-18T12:00:00+05:30"
slug = "tools-of-the-trade-fd"
summary = "Probably the final post of this series? Let's talk about fd!"
tags = ["fd", "cli-tools"]
title = "Tools of the trade: fd"
+++

Continuing [this series](/categories/tools-of-the-trade/), let's talk about [fd](https://github.com/sharkdp/fd).

## What is fd?

`fd` is an extremely fast replacement for the GNU coreutils' `find(1)` tool. It's written in Rust, and is built for humans, arguably unlike `find(1)`.

## Why do I use it?

Other than the obvious speed benefits, one of the most critical improvements you'll notice in your workflow with `fd` is the presence of good defaults. By default `fd` ignores hidden files and folders, and respects `.gitignore` and similar files. Here's a small comparison to show you the differences between `fd` and `find(1)`'s default behaviors.

Running both `find` and `fd` on the repository for this website, then piping the results into [del.dog](https://del.dog):

```bash
$ find | paste
https://del.dog/raw/greconillo
```

```bash
$ fd | paste
https://del.dog/raw/thelerrell
```

If you check both those links, you'll observe that `find(1)` has a significantly higher number of results compared to `fd`. Looking closely, you'll also notice that `find(1)` has dumped the entire `.git` directory into the results as well, alongwith the `public` directory of Hugo which contains the built site. These are surely important directories, but you almost **never** want to search through your `.git` directory or build artifacts. `fd` shines here by excluding them automatically, while being significantly faster than `find(1)` even when they're both returning the exact number of results.

On top of these, `fd` also comes with a very rich set of options that let you do many typically complex operations within `fd` itself.

### Converting all JPEG files to PNG

```bash
$ fd -tf jpg$ -x convert {} {.}.png
```

Some new things here!

- `-tf` means we only want files. There are multiple options for this in `fd`, including directory, executable, symlink, and even UNIX pipes and sockets.
- `jpg$` is our search term, in RegEx. `fd` makes use of [BurntSushi](https://github.com/BurntSushi)'s excellent [regex](https://github.com/rust-lang/regex) library for extremely quick RegEx parsing, and is able to thus support it by default. You can override this by passing `-g`/`--glob` to use glob-based matching instead. RegEx itself is too complicated, and my experience with it too limited, to actually cover it all here. All you need to know here is that the `$` at the end simply means that we want `jpg` to be the final characters of our matching term.
- `-x` is one of two exec modes provided by `fd`. `-x` runs the provided command for each term separately, in a multi-threaded fashion, so for long-running tasks you might want to reduce CPU load by restricting threads using `--threads <num>`.
- `{}` and `{.}` are part of `fd`'s execution placeholders that let you manipulate search results a bit more before handing them off to external commands. `{}` is replaced with the result as-is, and `{.}` strips the file extension. There are a couple more that you can check out using `fd --help`.
- `convert` is an external command from the ImageMagick suite of tools.

### Finding and deleting all files with a specific extension

```bash
$ fd -HItf \\.xml$ -X rm -v
```

Mostly familiar now, but with some key differences.

- `-H` and `-I` combined are used to include **h**idden and **i**gnored files into the results.
- `\\.xml$` is a more expansive RegEx that ensures that you only delete files that match `a_file.xml` and not `this_is_not_an_xml`, by ensuring that we match on `.xml` and not just `xml`. The double backslash is an escape sequence, because `.` has a special meaning in RegEx that we do not want here.
- `-X` is the other exec mode, batch. It runs the given command by passing all results as parameters in one go. Since we want to delete files, and `rm` lets you specify an arbitrary amount of arguments, we can use this and thus only run `rm` once.

### Updating all git repositories in a directory

```bash
$ fd -Htd ^.git$ --maxdepth 1 -x hub -C {//} sync
```

Already feels like home!

- `-Htd` together search for hidden folders.
- `^.git$` matches exactly on `.git` by mandating that `.git` be both the first (^) and last ($) characters.
- `--maxdepth 1` is a speed optimization to make `fd` only check the current directory and not traverse.
- `-x` again runs each command separately
- `{//}` gives us the parent directory. For `msfjarvis.dev/.git`, this will give you `msfjarvis.dev`.

[hub](https://hub.github.com) is a `git` wrapper that provides some handy features on top like `sync` which updates all locally checked out branches from their upstream remotes. You can re-implement this with some leg work but I'll leave that as an exercise for you.

And that's about it! Let me know what you think of `fd` and if you're switching to it.

This was part 3 of the [Tools of the trade](/categories/tools-of-the-trade/) series.
