+++
categories = ["zig"]
date = "2021-05-15T12:00:00+05:30"
lastmod = "2021-05-15T12:00:00+05:30"
slug = "learning-zig--day-2"
summary = "Onwards in our quest to learn Zig"
tags = ["learn"]
title = "Learning Zig - Day 2"
+++

In the [previous post] I documented how I went about setting up my Zig environment, and it's now time to start learning things.

My preferred method of learning new languages is rebuilding an existing project in them, like I did when going from [Python] to [Kotlin] to [Rust]. For Zig, I've elected to rebuild my [healthchecks-rs] library. It's something I use on a day-to-day basis for keeping an eye on my backup jobs, and it would be a great addition to the [healthchecks.io ecosystem].

# Getting the basics down

Among the resources enlisted on the Zig [getting started] page, I opted to go with [ziglearn.org] for learning the ropes of the language. It is concise yet detailed, and the chapter-wise breakdown makes for great mental "checkpoints", much like the [Rust book].

For this post I'm going through [chapter 1].

# Thoughts™️

I'm going to use this section to jot down my thoughts about Zig, broken down by the sections on ZigLearn. I'll skip the parts that I don't have anything to say on.

## Assignment

The presence of `undefined` is _very_ interesting to me. It appears to be functionally identical to Rust's [Default trait], as shown in this snippet (had to skip to structs for this since I was so curious about it).

```zig
const std = @import("std");

const Vec3 = struct {
    x: f32,
    y: f32,
    z: f32,
};

pub fn main() void {
    const inferred_constant: Vec3 = undefined;
    std.debug.print("Hello, {d}!\n", .{inferred_constant});
}
```

which prints:

```
➜ zig build run
Hello, Vec3{ .x = 0, .y = 0, .z = 0 }!
```

I have clearly not gotten very far yet, but initial thoughts here: Rust's trait-based implementation means I can customize the "default" values for my structs, which I'm not seeing in this implicit coercion yet. Guess we'll find out soon whether or not this can be handled explicitly :D

## Arrays

The syntax for array declarations is quite clear and explicit, which I like. Notably, while you can do this:

```zig
const implicitly_sized_array = [_]u8{}; // _ means "infer the size"
```

you cannot have an inferred size reference as the type:

```zig
const implicitly_sized_array[_]u8 = {};
```

Rust also [disallows this](https://play.rust-lang.org/?version=nightly&mode=debug&edition=2018&gist=f27a1a0b20feebe3e6d0a3417f25ce45), but the error is surprisingly worse than with Zig. Rust's resident diagnostics magician Esteban [assures me](https://twitter.com/ekuber/status/1393566561005314048) this is a regression and is being tracked.

The only problem I encountered here was that I can't figure out how to print an array!

```zig
const implicitly_sized_array = [_]u8{0, 1, 2, 3};
std.debug.print("This is an array: {}\n", .{implicitly_sized_array});

// Outputs: "This is an array: "
```

I found a [PR that overhauls formatting] but nothing there gave me any pointers on why my code doesn't work. Hopefully this'll get cleared up later.

## If

Nothing special here, aside from the early introduction to testing, which is slightly more pleasant than with Rust. I do however have qualms about the test output, which is unnecessarily noisy:

```shell
Test [2/2] test "while with continue expression"... expected 2080, found 10
/nix/store/nhd75c4sr3l9wlaspilkwawx5ixkn74w-zig-0.7.1/lib/zig/std/testing.zig:74:32: 0x206f9a in std.testing.expectEqual (test)
                std.debug.panic("expected {}, found {}", .{ expected, actual });
                               ^
/home/msfjarvis/git-repos/zig-playground/src/main.zig:29:24: 0x205abd in test "while with continue expression" (test)
    testing.expectEqual(sum, 10);
                       ^
/nix/store/nhd75c4sr3l9wlaspilkwawx5ixkn74w-zig-0.7.1/lib/zig/std/special/test_runner.zig:61:28: 0x22e161 in std.special.main (test)
        } else test_fn.func();
                           ^
/nix/store/nhd75c4sr3l9wlaspilkwawx5ixkn74w-zig-0.7.1/lib/zig/std/start.zig:334:37: 0x20749d in std.start.posixCallMainAndExit (test)
            const result = root.main() catch |err| {
                                    ^
/nix/store/nhd75c4sr3l9wlaspilkwawx5ixkn74w-zig-0.7.1/lib/zig/std/start.zig:162:5: 0x2071d2 in std.start._start (test)
    @call(.{ .modifier = .never_inline }, posixCallMainAndExit, .{});
    ^
error: the following test command crashed:
./src/zig-cache/o/5a647f3d3394214b30b3861a6b0ffbbb/test
```

## Defer

The `defer` language feature is something I've always been curious about since seeing it in Go, so I'm excited to discover use-cases for it when I finally have it available. Through ZigLearn I discovered that `defer` calls can be stacked to be executed in LIFO order, and Golang does it in the exact same fashion.

## Errors

I like how easy it is to define errors, but the syntax feels kinda icky. Having each error enum I declare 'magically' become a property on the `error` keyword doesn't sit right with me :(

```zig
const NumericError = error{};

fn mayError(shouldError: bool) anyerror!u32 {
    return if (shouldError)
        // This is different from what I'm accustomed to as a user of
        // Either/Result type monads.
        error.NumericError
    else
        10;
}
```

## Runtime Safety

Being able to turn off runtime safety features (like bounds checking) in specific blocks is pretty interesting! Not sure if I'll ever have a valid use for it though...

# Conclusion

I like most of what I've seen so far in Zig. Aside from the issues I mentioned above, the lack of string type is a very confusing thing for me. I've kinda come to expect it everywhere based on my previous experiences with Python, Java, Kotlin, and Rust; but maybe I'll now learn to appreciate how every character on my screen is just numbers :D.

I was very easily distracted today, so I only made it a third of the way in 3 hours for a chapter that is supposed to take 1 hour for the whole thing. Hoping to finish it tomorrow!

[previous post]: /posts/first-steps-with-zig
[python]: https://msfjarvis.dev/g/walls-manager
[kotlin]: https://msfjarvis.dev/g/walls-bot
[rust]: https://msfjarvis.dev/g/walls-bot-rs
[healthchecks-rs]: https://msfjarvis.dev/g/healthchecks-rs
[healthchecks.io ecosystem]: https://healthchecks.io/docs/resources/
[getting started]: https://ziglang.org/learn/getting-started/
[ziglearn.org]: https://ziglearn.org/
[rust book]: https://doc.rust-lang.org/book/
[chapter 1]: https://ziglearn.org/chapter-1/
[default trait]: https://doc.rust-lang.org/std/default/trait.Default.html
[pr that overhauls formatting]: https://github.com/ziglang/zig/pull/6870
[`unreachable`]: https://ziglearn.org/chapter-1/#unreachable
