+++
categories = ["kotlin"]
date = 2020-12-22
description = "Kotlin 1.4.30 is poised to improve on multiple pain points with inline classes, making them more generally useful. Let's look at these changes!"
slug = "improvements-to-inline-classes-in-kotlin-1-4-30"
socialImage = "/uploads/kotlin_social.webp"
tags = ["kotlin", "inline classes"]
title = "Improvements to inline classes in Kotlin 1.4.30"
+++

> UPDATE(08/02/2021): Both these changes have been released in Kotlin 1.4.30 for all currently supported targets including Kotlin/Native.

## What are inline classes?

[Inline classes] are a Kotlin language feature introduced in Kotlin 1.3 that allow creating no-cost 'wrapper' classes. This is best understood with an example.

Imagine that your project requires an EmailAddress type.

```kotlin
class EmailAddress(val value: String)
```

This is _fine_, but there are hidden performance costs. Classes are initialized on the heap, and fields are much cheaper, fields of primitive types even more so. We only really need to be able to call some `String`s an `EmailAddress`, so we can make this class `inline`.


```kotlin
inline class EmailAddress(val value: String)
```

This will result in the EmailAddress wrapper being erased at runtime into direct access of the underlying `value` field. The rules around this are not as simple as "`inline` means it will always be inlined", and I recommend reading the [representation of inline classes] documentation to get a better idea of what particular situations the compiler can optimize.

## Upcoming improvements for inline classes

With that small refresher on inline classes, let's talk about the restrictions that are being lifted in 1.4.30 and how they are helpful for us as developers.

### `init {}` blocks are now allowed

This is pretty straightforward: you can now have initialization logic in inline classes. Let's re-use our email example but now try to perform some validation.

```kotlin
inline class EmailAddress(val value: String) {
  // 🎉 New in Kotlin 1.4.30
  init {
    require(value.isNotEmpty()) { "empty email address does not make sense" }
  }
}
```

On Kotlin 1.4.20, this will fail to compile with `Inline class cannot have an initializer block`. This change is valuable because ultimately most of us will be wrapping primitive types into these classes and will frequently have restrictions on what is valid, so being able to validate is extremely helpful to catch invalid values early.

### Primary constructor can be made non-public

The primary constructor of an inline class can now be made `internal` or `private`, which was previously impossible.

```kotlin
// Sample courtesy https://youtrack.jetbrains.com/issue/KT-28056#focus=Comments-27-4357288.0-0
inline class EmailAddress @PublishedApi
/* 🎉 New in Kotlin 1.4.30 */
internal constructor(private val value: String) {
  override fun toString(): String = value
  companion object {
    
    fun parse(string: String): EmailAddress {
      check(string.contains('@')) { "invalid email address." }
      return EmailAddress(string)
    }
  }
}
```

_Weeeeeeeeeeeeeeeeeeeeeeeeeee_

Yeah. What's happening here is that we've made the constructor of `EmailAddress` `internal` to restrict its use to the current module, but annotated it with [`@PublishedApi`] which makes it legal to use in public inline functions. Read the docs for the [`@PublishedApi`] annotation to get a better idea about what this means for you, since it's out of scope here.

Doing this allows us to have an `EmailAddress` type that can be used to verify that a `String` is a valid email and then have that information be carried downstream as the value's type. Why is having the type important? Allow me to refer you to "[Aiming for correctness with types]", provided you have a free hour or so. It's worth it.


[inline classes]: https://kotlinlang.org/docs/reference/inline-classes.html#inline-classes
[representation of inline classes]: https://kotlinlang.org/docs/reference/inline-classes.html#representation
[`@publishedapi`]: https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-published-api/
[aiming for correctness with types]: https://fasterthanli.me/articles/aiming-for-correctness-with-types
