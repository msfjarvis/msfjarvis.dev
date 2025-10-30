+++
title = "Cargo failing at gitignore-d files while publishing"
date = 2025-09-14T22:31:48Z
tags = ["Rust"]
+++

Finally managed to find a workaround for the Rust problem I was having with `cargo publish` picking up files from my gitignore-d `.direnv` directory and complaining about them being uncommitted.

This was the result of cascading surprises: setting `package.includes` causes gitignore to no longer be considered, and `"README.md"` in `package.includes` actually works like `"**/README.md"`' and picks up the READMEs from the repositories in `.direnv/flake-inputs/`.

Upstream issue: [https://github.com/rust-lang/cargo/issues/12294#issuecomment-2171044946](https://github.com/rust-lang/cargo/issues/12294#issuecomment-2171044946)
