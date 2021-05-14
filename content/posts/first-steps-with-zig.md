+++
categories = ["zig"]
date = 2021-05-14
description = "I decided to learn Zig, and here's how I'm preparing for it."
slug = "first-steps-with-zig"
tags = ["zig", "learn"]
title = "First steps with Zig"
+++

[Zig] is a systems programming language much akin to [Rust] and C, and has been showing up in my feeds a lot as of late. Many Zig programmers have [documented their experience with Zig] as much better than with Rust, which I have been programming in for the last year or so, citing simplicity and ease. I tend to agree that Rust can often be _complex_ to enforce the guarantee of being _correct_, so I set out to finally buy into the promise of Zig and give it a shot.

# Compiler and IDE setup

The [installing Zig] page recommends that while using the Zig stable releases is fine for evaluating it, their [stable release cadence] matches LLVM's ~6 months which means they often rendered outdated by the fast pace of Zig development.

Since I wanted to stick with using [Nix] to manage my temporary Zig environment, I went with the stable 0.7.1 release available on nixpkgs.

A quick `nix-shell -p zig` later, I now had access to the Zig compiler


```shell
➜ nix-shell -p zig
➜ zig version
0.7.1
```

To be able to use VSCode for writing Zig, I also installed the official [zls] language server for Zig. This did get me go-to-declaration support for the standard library, but not syntax highlighting.

# Learning resources

The Zig team frankly admits that they do not have the resources to maintain extensive learning resources yet, but did link to [ziglearn.org] which seems like the next best thing. There is a [rustlings] counterpart in [ziglings], and the [standard library reference] also exists along with a [language reference] for people who prefer to learn that way. There's something for everyone, and you'll notice most of the **good** learning content is community sourced as opposed to Rust which has an official [book] and maintains the [rustlings] repository as a first-party member of the Rust ecosystem.


# Your first program

The `zig` CLI contains commands to generate new projects easily, so let's create a new binary project.

```
➜ zig init-exe
info: Created build.zig
info: Created src/main.zig
info: Next, try `zig build --help` or `zig build run`
```

The `build.zig` file presumably describes to the `zig` CLI how to build this program, and `src/main.zig` is our application code. Here's what `zig init-exe` gives you for a "hello world" program:

```zig
const std = @import("std");

pub fn main() anyerror!void {
    std.log.info("All your codebase are belong to us.", .{});
}
```

Cheeky.

This post is just a brief overview of how I went about setting things up for learning Zig. I intend to post more detailed blogs as I progress :)

[Zig]: https://ziglang.org
[Rust]: https://rust-lang.org
[documented their experience with Zig]: https://kevinlynagh.com/rust-zig/
[installing Zig]: https://ziglang.org/learn/getting-started/#installing-zig
[stable release cadence]: https://ziglang.org/learn/getting-started/#tagged-release-or-nightly-build
[Nix]: https://nixos.org/
[zls]: https://github.com/zigtools/zls
[ziglearn.org]: https://ziglearn.org/
[rustlings]: https://github.com/rust-lang/rustlings
[ziglings]: https://github.com/ratfactor/ziglings
[standard library reference]: https://ziglang.org/documentation/0.7.1/std/
[language reference]: https://ziglang.org/documentation/0.7.1/
[book]: https://doc.rust-lang.org/book/
