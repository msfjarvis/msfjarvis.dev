+++
categories = ["rust"]
date = 2021-10-17
description = "Some tips on building static binaries of Rust projects targeting Linux"
draft = false
slug = "building-static-rust-binaries-for-linux"
tags = ["rust", "static linking"]
title = "Building static Rust binaries for Linux"
socialImage = "uploads/rust_social.webp"
+++

Rust has supported producing statically linked binaries since [RFC #1721] which proposed the `target-feature=+crt-static` flag to statically link the platform C library into the final binary. This was initially only supported for Windows MSVC and the MUSL C library. While MUSL works for _most_ people, it
has many problems by virtue of being a work-in-progress such as [unpredictable performance] and many unimplemented features which programs tend to assume are present due to glibc being ubiquitous. In lieu of these concerns, support was added to Rust in 2019 to be able to [statically link against glibc].

Unfortunately, if you try to directly use it with `RUSTFLAGS='-C target-feature=+crt-static' cargo build` there is a good chance you'll run into an error similar to this:

```
cannot produce proc-macro for `async-trait v0.1.51` as the target `x86_64-unknown-linux-gnu` does not support these crate types
```

This is a bit of a head scratcher, because the target (your host machine) _definitely_ supports proc-macro crates. Turns out, even Rust contributors [were confused by this]. The "fix" for this is apparently to pass in the `--target` explicitly. The reason behind this seems to be a bug with cargo, where the `RUSTFLAGS` are applied to the target platform only when `--target` is explicitly provided. Without it, `RUSTFLAGS` values are set for the host only which results in the errors we see. More details are available [Rust issue #78210]

Therefore, the correct way to build a statically linked glibc executable for an x86_64 machine is this:

```shell
RUSTFLAGS='-C target-feature=+crt-static' cargo build --release --target x86_64-unknown-linux-gnu
```

## Other potential problems

You may be unable to statically link your binary even after all this, due to dependencies that _mandate_ dynamic linking. In some cases this is avoidable, such as using [rustls] in place of OpenSSL for cryptography, and [hyper] in place of bindings to cURL for HTTP, not so much in others. Thanks to the convention of native-linking crates using the `-sys` suffix in their name it is fairly simple to find if your build has dependencies that dynamically link to libraries. Using `cargo`'s native `tree` subcommand and `grep`ing (or [ripgrep]ing for me), you can locate native dependencies. Running `cargo tree | rg -- -sys` against [androidx-release-watcher]'s `v4.1.0` release gives us this:

```bash
$ cargo tree | rg -- -sys
│   │   │   │   ├── curl-sys v0.4.45+curl-7.78.0
│   │   │   │   │   ├── libnghttp2-sys v0.1.6+1.43.0
│   │   │   │   │   ├── libz-sys v1.1.3
│   │   │   │   │   └── openssl-sys v0.9.66
│   │   │   │   ├── openssl-sys v0.9.66 (*)
│   │   │   ├── curl-sys v0.4.45+curl-7.78.0 (*)
│   └── web-sys v0.3.53
│       ├── js-sys v0.3.53
```

This indicates curl, zlib, openssl, and libnghttp2 as well as a bunch of WASM-related things are being dynamically linked into my executable. To resolve this, I looked at the build features exposed by [surf] and found that it selects the `"curl_client"` feature by default, which can be turned off and replaced with `"h1-client-rustls"` which uses an HTTP client backed by [rustls] and [async-std] and no dynamically linked libraries. Enabling [this build feature] removed all `-sys` dependencies from [androidx-release-watcher], allowing me to build static executables of it.

[rfc #1721]: https://github.com/rust-lang/rfcs/pull/1721
[unpredictable performance]: https://www.reddit.com/r/rust/comments/a6pna3/why_rust_uses_glibc_and_not_musl_by_default_for/ebzpzld/
[statically link against glibc]: https://github.com/rust-lang/rust/issues/65447
[were confused by this]: https://github.com/rust-lang/rust/issues/78210
[rust issue #78210]: https://github.com/rust-lang/rust/issues/78210#issuecomment-714776007
[rustls]: https://github.com/rustls/rustls
[hyper]: https://hyper.rs
[ripgrep]: https://github.com/BurntSushi/ripgrep
[androidx-release-watcher]: https://msfjarvis.dev/g/androidx-release-watcher
[surf]: https://github.com/http-rs/surf
[async-std]: https://github.com/async-rs/async-std
[this build feature]: https://msfjarvis.dev/g/androidx-release-watcher/b67a212106d8
