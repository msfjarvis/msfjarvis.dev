+++
summary = "Rust is an amazing systems language that is on an explosive rise thanks to its memory safety guarantees and fast, iterative development. In this post, I recap some of the tooling that I use with Rust to make coding in it even more fun and intuitive"
slug = "tools-for-effective-rust-development"
date = 2019-09-07
socialImage = "rust_social.webp"
devLink = "https://dev.to/msfjarvis/tools-for-effective-rust-development-3mb4"
title = "Tools for effective Rust development"
categories = ["rust"]
tags = ["cargo", "rls", "cargo-edit", "clippy"]
+++

[Rust] is a memory-safe systems language that is blazing fast, and comes with no runtime or garbage collector overhead. It can be used to build very performant web services, CLI tools, and even [Linux kernel modules](https://github.com/fishinabarrel/linux-kernel-module-rust)!

[Rust] also provides an assortment of tools to make development faster and more user-friendly. I'll be going over some of them here that I've personally used and found to be amazing.

## cargo-edit

[cargo-edit] is a crate that extends Rust's Cargo tool with `add`, `remove` and `upgrade` commands that allow you to manage dependencies with ease. The [documentation](https://github.com/killercup/cargo-edit/blob/master/README.md#available-subcommands) goes over these options in detail.

I personally find `cargo-edit` useful in projects with a lot of dependencies as it gets tiresome to manually hunt down updated versions.

## cargo-clippy

[cargo-clippy] is an advanced linter for Rust that brings together **331** ([at the time of writing](https://rust-lang.github.io/rust-clippy/stable/index.html)) different lints in one package that's built and maintained by the Rust team.

I've found it to be a great help alongside the official documentation and ["the book"](https://doc.rust-lang.org/book/) as a way of writing cleaner and more efficient Rust code. As a beginner Rustacean, I find it very helpful in breaking away from my patterns from other languages and using more "rust-y" constructs and expressions in my code.

## rustfmt

[rustfmt] is the official formatting tool for Rust code. It's an opinionated, zero-configuration tool that "just works". It has not reached a `1.0` release yet, which entails some [caveats](https://github.com/rust-lang/rustfmt#limitations) with its usage but in my experience it will work for most people and codebases without any hassle.

As a Kotlin programmer I am very used to having an official styleguide for consistent formatting across all projects. `rustfmt` brings that same convenience to Rust development, which is major since Rust does not have any official IDE which would do it automatically.

## rls

[rls] is Rust's implementation of Microsoft's [language-server-protocol](https://microsoft.github.io/language-server-protocol/), an attempt at standardizing the interface between language tooling and IDEs to allow things like code completion, find all references and documentation on hover to work seamlessly across different IDEs. [VSCode](https://code.visualstudio.com/) implements the `language-server-protocol` and integrates seamlessly with `rls` using the [rust-lang.rust](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust) extension to create a compelling IDE experience.

Being a beginner, the ability for code to be checked within the editor and not requiring builds for each change is a huge speed-up in the learning and development process. Documentation about crates and errors being available directly on hover is certainly helpful in furthering my knowledge and understanding of the language.

## Conclusion

So this is my list of must-have tooling that has helped me continuously improve as a Rustacean. I'm VERY curious to hear what others are using! I opted to stick with official tools where possible since they've proven very reliable and I seem to find considerably more help online with them, but I'd love to try out non-official alternatives that offer significant benefits :)

[rust]: https://rust-lang.org/
[cargo-edit]: https://github.com/killercup/cargo-edit
[cargo-clippy]: https://github.com/rust-lang/rust-clippy
[rustfmt]: https://github.com/rust-lang/rustfmt
[rls]: https://github.com/rust-lang/rls
