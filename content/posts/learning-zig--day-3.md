+++
categories = ["zig"]
date = 2021-05-16
description = "Finishing up the basics"
slug = "learning-zig--day-3"
tags = ["zig", "learn"]
title = "Learning Zig - Day 3"
+++

[Yesterday's post] was a bit shorter than I planned, since I didn't manage to go through as much of the ZigLearn [chapter 1] as I thought I would. Today we'll be wrapping it up.

# Thoughts™️

Same as yesterday, this section will be a brain dump of what I think of the things I learn today.

## Pointers

Rust made pointers a very friendly concept thanks to the borrow checker and amazing compiler diagnostics, and Zig seems to follow the same path with keeping them straightforward. I'm not the biggest fan of the `variable.*` syntax for dereferencing a pointer, since it breaks my existing muscle memory in a major way but I'm sure I'll get used to it in no time.

Just like Rust, mutable and immutable pointers are explicitly distinct which is a ✅ in my book.

There wasn't a lot of content on ZigLearn about [many-item pointers] so I'm still not sure I understand any of it. That's probably just me though.

I've known and used Rust's `usize` in my programs, but only after reading about [pointer-sized integers] on ZigLearn did I actually make the connection that the size of a `usize` is that of a pointer. 💡

## Enums

On a syntactic level, Zig enums are closer to Kotlin than to Rust w.r.t. declaring functions in them, which is very nice.

## Structs

The syntax note from enums applies here as well, with an additional nicety about pointers. Specifically, a struct function that accepts a pointer value will automatically derefence the value inside the function body. This only goes one level deep though, so keep that in mind.

```zig
const Rectangle = struct {
    length: i32,
    width: i32,

    pub fn swap(self: *Rectangle) void {
        // No explicit dereferencing needed!
        const tmp = self.length;
        self.length = self.width;
        self.width = tmp;
    }
};
```

## Unions

I have never worked with `union`s, but [tagged unions] gave me awful ideas about matching Kotlin's [sealed classes] functionality so I'm looking forward to writing some cursed code :D

## Integer rules and Floats

Zig's type coercion syntax is nicer than Rust's, though the lack of a runtime error concerned me initially. Rust's [TryInto] trait is explicit about the fact that the conversion is fallible, and thus returns a [Result]. Zig on the other hand attempts to validate these conversions at compile-time. Given this code:


```zig
fn returnsNum() u32 {
    return 1_00_000;
}
 
test "typecast" {
    testing.expect(@TypeOf(@as(u8, returnsNum())) == u8);
}
```

The build will fail with:

```
./src/main.zig:182:46: error: expected type 'u8', found 'u32'
    testing.expect(@TypeOf(@as(u8, returnsNum())) == u8);
                                             ^
./src/main.zig:182:46: note: unsigned 8-bit int cannot represent all possible unsigned 32-bit values
    testing.expect(@TypeOf(@as(u8, returnsNum())) == u8);
```

This is good, but I haven't yet found a way to force the conversion to go through in instances where I can confirm that the incoming u32 definitely fits in a u8.

## Optionals

Zig's [Optionals] are a very good parallel for Rust's [Option], though Zig provides a lot more syntactic niceties.

The fact that you can use a while loop to capture values until they become null is pretty damn sweet.

```zig
var numbers_left: u32 = 4;
fn eventuallyNullSequence() ?u32 {
    if (numbers_left == 0) return null;
    numbers_left -= 1;
    return numbers_left;
}

test "while null capture" {
    var sum: u32 = 0;
    while (eventuallyNullSequence()) |value| {
        sum += value;
    }
    expect(sum == 6); // 3 + 2 + 1
}
```

# Conclusion

Everything following optionals was either uncontroversial or too powerful/low level for my current interests, so I admittedly glossed over some of the gory details.

[Chapter 2] introduces JSON, which we'll need for our eventual healthchecks.io library, so I'm looking forward to it! I do have work tomorrow, so we'll have to see if I can keep up the daily streak :)

[Yesterday's post]: /posts/learning-zig--day-2
[chapter 1]: https://ziglearn.org/chapter-1/
[many-item pointers]: https://ziglearn.org/chapter-1/#many-item-pointers
[pointer-sized integers]: https://ziglearn.org/chapter-1/#pointer-sized-integers
[sealed classes]: https://kotlinlang.org/docs/sealed-classes.html
[tagged unions]: https://ziglang.org/documentation/master/#Tagged-union
[TryInto]: https://doc.rust-lang.org/std/convert/trait.TryInto.html
[Result]: https://doc.rust-lang.org/std/result/enum.Result.html
[Optionals]: https://ziglang.org/documentation/master/#Optionals
[Option]: https://doc.rust-lang.org/std/option/enum.Option.html
[chapter 2]: https://ziglearn.org/chapter-2/
