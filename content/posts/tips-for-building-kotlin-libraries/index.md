+++
summary = "Building libraries is hard, and keeping track of your public API surface harder. Kotlin 1.4's explicit API mode tries to make the latter not be difficult anymore."
draft = true
slug = "tips-for-building-kotlin-libraries"
title = "Tips and tricks for building libraries in Kotlin"
date = 2020-11-21T00:00:00.000Z
lastmod = 2020-11-21T00:00:00.000Z
categories = ["android", "kotlin"]
tags = ["libraries"]
+++

Building a library is arguably a far more involved task than building an application. You need to be _extra_ mindful of your dependencies, and ensure that you are not breaking source and/or binary compatibility unintentionally. When doing so in Kotlin, you may also need to also provide an idiomatic API surface for Java callers if you're offering JVM support.

I have _some_ experience building libraries, and have had the fortune of seeing a **lot** of other, much smarter people do it. This post aims to serve as a collection of what I've learned by doing things myself and observing others, that will hopefully be helpful to people trying their hand at library development.

## Avoid `data` classes in your public API

Kotlin's [data classes](https://kotlinlang.org/docs/reference/data-classes.html#data-classes) are a fantastic language feature, but unfortunately they pose many challenges. Jake Wharton has written about this in great detail over on [his blog](https://jakewharton.com/public-api-challenges-in-kotlin/), but I will reproduce the problem here as a TL;DR for people who just want to get an overview of the problem.

Here's an example class:

```kotlin
data class Example(
  val username: String,
  val id: Int,
)
```

Compiling this with `kotlinc` then disassembling it with `javap` gives us this:

```java
public final class Example {
  public final java.lang.String getUsername();
  public final int getId();
  public Example(java.lang.String, int);
  public final java.lang.String component1();
  public final int component2();
  public final Example copy(java.lang.String, int);
  public static Example copy$default(Example, java.lang.String, int, int, java.lang.Object);
  public java.lang.String toString();
  public int hashCode();
  public boolean equals(java.lang.Object);
}
```

Now, let's add a new field there. The resultant diff will look like this:

```diff
 data class Example(
   val username: String,
+  val realname: String? = null,
   val id: Int,
-)
+) {
+  constructor(username: String, id: Int): this(username, null, id)
+}
```

What we did here was add a secondary constructor with the previous signature, as a way of preserving backwards compatibility. As Jake notes in his article, even this effort from us breaks the public API. Let's compile and disassemble this again to see why.

```diff
 Compiled from "Example.kt"
 public final class Example {
   public final java.lang.String getUsername();
+  public final java.lang.String getRealname();
   public final int getId();
+  public Example(java.lang.String, java.lang.String, int);
+  public Example(java.lang.String, java.lang.String, int, int, kotlin.jvm.internal.DefaultConstructorMarker);
   public Example(java.lang.String, int);
   public final java.lang.String component1();
-  public final int component2();
-  public final Example copy(java.lang.String, int);
-  public static Example copy$default(Example, java.lang.String, int, int, java.lang.Object);
+  public final java.lang.String component2();
+  public final int component3();
+  public final Example copy(java.lang.String, java.lang.String, int);
+  public static Example copy$default(Example, java.lang.String, java.lang.String, int, int, java.lang.Object);
   public java.lang.String toString();
   public int hashCode();
   public boolean equals(java.lang.Object);
```

If the problem is not immediately apparent, consider this: `component2()` is no longer returning an `int`. This breaks destructing from Kotlin. The `copy` method's API also changed, which is another binary incompatible change.

You can read more details about how to structure your public classes to avoid this, in Jake's post that I linked above.

## (Ab)use `@SinceKotlin` for offering Java-only APIs

Full disclosure: I picked this up from [LeakCanary](https://github.com/square/leakcanary) so credit goes entirely to [Piwai](https://twitter.com/piwai) for thinking of it.

[`@SinceKotlin`](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/-since-kotlin/) is an annotation offered in Kotlin that allows things to be marked with the Kotlin version they were first introduced. This allows the usage of classes/methods/properties et al be checked during compile time based on the `-api-version` compiler flag.

For example, if you write this code:

```kotlin
@SinceKotlin("1.4")
class Example(val username: String)
```

and try to compile it like this:

```bash
$ kotlinc example.kt -Werror -api-version 1.3
error: warnings found and -Werror specified
example.kt:1:1: warning: the version is greater than the specified API version 1.3
@SinceKotlin("1.4")
^
```

you can see that compilation fails. I had to pass in `-Werror` manually here, but I believe the Kotlin Gradle Plugin handles making this an error automatically.

How does that help us offer Java-only APIs though? Well, here's how Piwai [did it](https://github.com/square/leakcanary/blob/69d54f36ed9d3204624d214835ba99898665a346/leakcanary-android-core/src/main/java/leakcanary/LeakCanary.kt#L177-L184):

```kotlin
/**
 * Construct a new Config via [LeakCanary.Config.Builder].
 * Note: this method is intended to be used from Java code only. For idiomatic Kotlin use
 * `copy()` to modify [LeakCanary.config].
 */
@Suppress("NEWER_VERSION_IN_SINCE_KOTLIN")
@SinceKotlin("999.9") // Hide from Kotlin code, this method is only for Java code
fun newBuilder() = Builder(this)
```

Since the version here is set to `999.9`, which hopefully Kotlin will never be over, any attempt to use this will result in a compiler error. The only way to work around this madness is to be equally mad and pass `-api-version 999.9`, which you'd never do, right? 😬
