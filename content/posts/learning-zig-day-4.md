+++
categories = ["zig"]
date = 2021-05-18
description = "Brushing up on standards"
slug = "learning-zig--day-4"
tags = ["zig", "learn"]
title = "Learning Zig - Day 4"
+++

[So much for hope]. Either way, we're back at it! Today I'll be getting familiar with common patterns in Zig like providing explicit allocators and learn about more of the standard library. This is of course, [chapter 2] of the ZigLearn.org curriculum.

# Thoughts™️

## Allocators

Rust's standard library performs allocations as and when necessary, automatically, and provides a separate `no_std` mode that eliminates the standard library from the build and only retains the [libcore] which is suitable for use in bare-metal deployments (more on that in [The Embedded Rust Book]). Zig takes an alternative approach, where the convention is that all functions in the the standard library that require allocations take in an explicit [Allocator] which can either be implemented by the user, or you can pick one of the many options available in the standard library itself.

I've never given an _extreme_ amount of thought to the allocations my programs perform, so I'm rather unopinionated on this. That being said, whenever I start working on the healthchecks library I'm definitely going to follow the ecosystem's practices and make allocations explicit for consumers.

## Filesystem

The FS APIs appear to be quite expansive, covering everything that I can think of, and I finally discovered a practical use-case for `defer`! I'm pretty sure I'll end up passing the incorrect [CreateFlags] on more than one occasion, but at least they're documented and discoverable, and I have _some_ memory of doing the same with Python back when I still believed in my country's education system :P

## Formatting

Finally an answer to my "how to format an array" mystery! It's fascinating that formatting also requires allocations, but then Rust does return an owned `String` rather than a `&str` when you format things so that should have been obvious in hindsight.

## JSON

The native JSON support looks pretty great, though I am left to wonder how much of [serde]'s flexibility is available here. Guess we'll find out soon enough :)

## Random numbers and crypto

Great to see native crypto in Zig! I'm not the target audience, but lack of crypto primitives in Rust seems to come up often so it's a nice plus for Zig.

## Formatting specifiers and Advanced Formatting

Zig's formatting system seems about as powerful as Rust's, _maybe more_, so it's definitely a plus for me since I've ended up debugging a lot of code with `println!("{:?}", $field)` in Rust 😅

# Conclusion

I skipped through the parts about HashMaps, Stacks, sorting and iterators since those are fairly straightforward concepts that Zig does not appear to reinvent in any way.

Overall, I'm liking everything I'm seeing. Very excited to start building things in Zig!

[so much for hope]: https://twitter.com/msfjarvis/status/1393977222990426114
[chapter 2]: https://ziglearn.org/chapter-2/
[libcore]: https://doc.rust-lang.org/core/index.html
[the embedded rust book]: https://docs.rust-embedded.org/book/intro/no-std.html
[allocator]: https://ziglang.org/documentation/0.7.1/std/#std;mem.Allocator
[createflags]: https://ziglang.org/documentation/0.7.1/std/#std;fs.File.CreateFlags
[serde]: https://serde.rs/
