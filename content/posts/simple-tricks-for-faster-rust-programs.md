+++
categories = ["rust", "dev"]
date = 2020-07-05T15:21:50
draft = true
slug = "simple-tricks-for-faster-rust-programs"
tags = ["rust", "dev", "perf"]
title = "Simple tricks for faster Rust programs"
description = "Rust programs are pretty fast on their own, but you can slightly augment their performance with some simple tricks."
+++

Rust is *pretty* fast. Let's get that out of the way. But sometimes, *pretty* fast is not fast enough.

Fortunately, it's also *pretty* easy to slightly improve the performance of your Rust binaries with minimal code changes. I'm gonna go over some of these tricks that I've picked up from many sources across the web (I'll post a small list of **very** good blogs run by smart Rustaceans who cover interesting Rust related things).

## Turn on full LTO

Rust by default runs a "thin" LTO pass across each individual [codegen unit](https://doc.rust-lang.org/rustc/codegen-options/index.html#codegen-units). This can be optimized with a very simple addition to your `Cargo.toml`

```toml
[profile.release]
codegen-units = 1
lto = "fat"
```

This makes the following changes to the `release` profile:

- Forces `rustc` to build the entire crate as a single unit, which lets LLVM makes smarter decisions about optimization thanks to all the code being together.
- Switches LTO to the `fat` variant. In `fat` mode, LTO will perform [optimization across the entire dependency graph](https://doc.rust-lang.org/rustc/codegen-options/index.html#lto) as opposed to the default option of doing it just to the local crate.

## Use a different memory allocator

Some time ago, Rust switched from using `jemalloc` on all platforms to the OS-native allocator. This caused serious performance regressions in many programs, including [fd](https://github.com/sharkdp/fd). To switch back to `jemalloc`, check out [this](https://github.com/sharkdp/fd/pull/481) PR for the changes required.

Note that this alone is not guaranteed to be helpful, and a lot of programs see little to no benefit, so please run your own benchmarks with [hyperfine](https://github.com/sharkdp/hyperfine) to confirm whether or not it helped you.


## Cows!

Rustaceans [love their cows](https://www.reddit.com/r/rust/comments/8o1pxh/the_secret_life_of_cows/).


# References
- Pascal Hertleif's [blog](https://deterministic.space/) - He's a very popular and active Rust developer and writes amazing, insightful articles.
- Amos Wenger's [blog](https://fasterthanli.me) - Amos' articles often go over important topics like API design through a comparison angle between Rust and another language to highlight differences and benefits to each approach.