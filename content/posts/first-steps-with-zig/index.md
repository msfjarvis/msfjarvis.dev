+++
categories = ["zig"]
date = 2021-05-14
lastmod = 2021-05-14
summary = "I've decided to learn Zig, and here's how I'm preparing for it."
slug = "first-steps-with-zig"
tags = ["learn"]
title = "First steps with Zig"
+++

[Zig] is a systems programming language much akin to [Rust] and C, and has been showing up in my feeds a lot as of late. Many Zig programmers have [documented their experience with Zig] as much better than with Rust, which I have been programming in for the last year or so, citing simplicity and ease. I tend to agree that Rust can often be _complex_ to enforce the guarantee of being _correct_, so I set out to finally buy into the promise of Zig and give it a shot.

# Compiler and IDE setup

The [installing Zig] page recommends that while using the Zig stable releases is fine for evaluating it, their [stable release cadence] matches LLVM's ~6 months which means they are often rendered outdated by the fast pace of Zig development.

Since I wanted to stick with using [Nix] to manage my (currently) temporary Zig environment, I went with the stable 0.7.1 release available on nixpkgs.

A quick `nix-shell -p zig` later, I now had access to the Zig compiler.

```shell
➜ nix-shell -p zig
➜ zig version
0.7.1
```

To be able to use VSCode for writing Zig, I also installed the official [zls] language server for Zig. This did get me go-to-declaration support for the standard library, ~~but not syntax highlighting. I'm not sure if that's intended, or a bug with my local setup~~. Syntax highlighting is also present, thanks to Lewis Gaul for his suggestion of using the `tiehuis.zig` extension.

# Learning resources

The Zig team frankly admits that they do not yet have the resources to maintain extensive learning resources, but the Zig community has stepped forward to fill in those gaps. [ziglearn.org] is a great jumping off point for people who prefer to learn language basics directly, and there is a [rustlings] counterpart in [ziglings] for learning by looking at code.

On the official side of things, you get the [standard library reference] as one would expect, as well as a fairly detailed [language reference].

This is in contrast with Rust, which has an officially maintained [book] and maintains [rustlings] as a first-party learning resource. They do however are a significantly larger and older team, so maybe with sufficient funding we'll see Zig be able to devote effort towards this as well.

# Your first program

The `zig` CLI contains commands to generate new projects easily, so let's create a new binary project.

```
➜ zig init-exe
info: Created build.zig
info: Created src/main.zig
info: Next, try `zig build --help` or `zig build run`
```

The `build.zig` file appears to describe to the `zig` CLI how to build this program, and `src/main.zig` is our application code. Here's what `zig init-exe` gives you for a "hello world" program:

```zig
// src/main.zig
const std = @import("std");

pub fn main() anyerror!void {
    std.log.info("All your codebase are belong to us.", .{});
}
```

Cheeky.

This post is just a brief overview of how I went about setting things up for learning Zig. I intend to post more detailed blogs as I progress :)

[zig]: https://ziglang.org
[rust]: https://rust-lang.org
[documented their experience with zig]: https://kevinlynagh.com/rust-zig/
[installing zig]: https://ziglang.org/learn/getting-started/#installing-zig
[stable release cadence]: https://ziglang.org/learn/getting-started/#tagged-release-or-nightly-build
[nix]: https://nixos.org/
[zls]: https://github.com/zigtools/zls
[ziglearn.org]: https://ziglearn.org/
[rustlings]: https://github.com/rust-lang/rustlings
[ziglings]: https://github.com/ratfactor/ziglings
[standard library reference]: https://ziglang.org/documentation/0.7.1/std/
[language reference]: https://ziglang.org/documentation/0.7.1/
[book]: https://doc.rust-lang.org/book/
