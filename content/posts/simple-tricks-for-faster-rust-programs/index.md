+++
date = 2020-07-05
summary = "Rust programs are pretty fast on their own, but you can slightly augment their performance with some simple tricks."
categories = ["rust", "dev"]
slug = "simple-tricks-for-faster-rust-programs"
title = "Simple tricks for faster Rust programs"
tags = ["perf"]
images = [ "cuddlyferris.webp" ]
+++

Rust is _pretty_ fast. Let's get that out of the way. But sometimes, _pretty_ fast is not fast enough.

Fortunately, it's also _pretty_ easy to slightly improve the performance of your Rust binaries with minimal code changes. I'm gonna go over some of these tricks that I've picked up from many sources across the web (I'll post a small list of **very** good blogs run by smart Rustaceans who cover interesting Rust related things).

## Turn on full LTO

Rust by default runs a "thin" LTO pass across each individual [codegen unit](https://doc.rust-lang.org/rustc/codegen-options/index.html#codegen-units). This can be optimized with a very simple addition to your `Cargo.toml`

```toml
[profile.release]
codegen-units = 1
lto = "fat"
```

This makes the following changes to the `release` profile:

- Forces `rustc` to build the entire crate as a single unit, which lets LLVM make smarter decisions about optimization thanks to all the code being together.
- Switches LTO to the `fat` variant. In `fat` mode, LTO will perform [optimization across the entire dependency graph](https://doc.rust-lang.org/rustc/codegen-options/index.html#lto) as opposed to the default option of doing it just to the local crate.

## Use a different memory allocator

Some time ago, Rust switched from using `jemalloc` on all platforms to the OS-native allocator. This caused serious performance regressions in many programs like [fd](https://github.com/sharkdp/fd). To switch back to `jemalloc`, check out [this](https://github.com/sharkdp/fd/pull/481) PR for the changes required.

Note that this alone is not guaranteed to be helpful, and a lot of programs see little to no benefit, so please run your own benchmarks with [hyperfine](https://github.com/sharkdp/hyperfine) to confirm whether or not it helped you.

## Cows!

Rustaceans [love their cows](https://www.reddit.com/r/rust/comments/8o1pxh/the_secret_life_of_cows/), and it's one of the most underrated APIs in the Rust standard library. It's claim to fame is relatively simple - it's a smart copy-on-write pointer. Or well, a smart clone-on-write pointer, as copy means something different in Rust as opposed to other languages.

Given a data wrapped in a `std::borrow::Cow`, you can avoid cloning the data if you only want immutable read access, which saves memory and improves runtime performance as well. Over a large codebase, these savings pile up to create a noticeable enough difference. Here's an example from the Rust standard library that explains this well.

```rust
use std::borrow::Cow;

fn abs_all(input: &mut Cow<[i32]>) {
    for i in 0..input.len() {
        let v = input[i];
        if v < 0 {
            // Clones into a vector if not already owned.
            input.to_mut()[i] = -v;
        }
    }
}

// No clone occurs because `input` doesn't need to be mutated.
let slice = [0, 1, 2];
let mut input = Cow::from(&slice[..]);
abs_all(&mut input);

// Clone occurs because `input` needs to be mutated.
let slice = [-1, 0, 1];
let mut input = Cow::from(&slice[..]);
abs_all(&mut input);

// No clone occurs because `input` is already owned.
let mut input = Cow::from(vec![-1, 0, 1]);
abs_all(&mut input);
```

# References

- Pascal Hertleif's [blog](https://deterministic.space/) - He's a very popular and active Rust developer and writes amazing, insightful articles.
- Amos Wenger's [blog](https://fasterthanli.me) - Amos' articles often go over important topics like API design through a comparison angle between Rust and another language to highlight differences and benefits to each approach.
- Stjepan Glavina's [blog](https://stjepang.github.io/) - He's done a lot of interesting perf-related work including optimising sorting in the stdlib and building async libraries. His writeups for the library work are very intriguing and go into great detail about the process.
