+++
categories = ["kotlin", "android", "teachingkotlin"]
date = "2019-12-16T12:00:00+05:30"
devLink = "https://dev.to/msfjarvis/teachingkotlin-part-3-caveats-coming-from-java-2e1k"
lastmod = "2019-12-16T12:00:00+05:30"
slug = "teachingkotlin-part-3--caveats-coming-from-java"
summary = "Part 3 of #TeachingKotlin covers some subtle differences between Kotlin and Java that might affect your codebases as you start migrating to or writing new code in Kotlin."
tags = []
title = "#TeachingKotlin Part 3 - Caveats coming from Java"
+++

When you start migrating your Java code to Kotlin, you will encounter multiple subtle changes that might catch you off guard. I'll document some of these gotchas that I and other people I follow have found and written about.

## Splitting strings

Java's `java.lang.String#split` [method](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#split-java.lang.String-) takes a `String` as it's first argument and creates a `Regex` out of it before attempting to split. Kotlin, however, has two variants of this method. One takes a `String` and uses it as a plaintext delimiter, and the other takes a `Regex` behaving like the Java method we mentioned earlier. Code that was directly converted from Java to Kotlin will fail to accommodate this difference, so be on the lookout.

## Runtime asserts

Square's [Jesse Wilson](https://twitter.com/jessewilson) found through an [OkHttp bug](https://github.com/square/okhttp/issues/5586) that Kotlin's `assert` function differs from Java's in a very critical way - the asserted expression is _always_ executed. He's written about it on his blog which you can check out for a proper write up: [Kotlin’s Assert Is Not Like Java’s Assert](https://publicobject.com/2019/11/18/kotlins-assert-is-not-like-javas-assert/).

TL; DR Java's `assert` checks the `java.lang.Class#desiredAssertionStatus` method **before** executing the expression, but Kotlin does it **after** which results in unnecessary, potentially significant overhead.

```java
// Good :)
@Override void flush() {
  if (Http2Stream.class.desiredAssertionStatus()) {
    if (!Thread.holdsLock(Http2Stream.this) == false) {
      throw new AssertionError();
    }
  }
}
```

```kotlin
// Bad :(
override fun flush() {
  if (!Thread.holdsLock(this@Http2Stream) == false) {
    if (Http2Stream::class.java.desiredAssertionStatus()) {
      throw AssertionError()
    }
  }
}
```

## Binary incompatibility challenges

[Jake Wharton](https://twitter.com/JakeWharton) wrote in his usual in-depth detail about how the Kotlin `data` class modifier makes it a challenge to modify public API without breaking source and binary compatibility. Kotlin's sweet language features that provide things like default values in constructors and destructuring components become the very thing that inhibits binary compatibility.

Take about 10 minutes out and give Jake's article a read: [Public API challenges in Kotlin](https://jakewharton.com/public-api-challenges-in-kotlin/).

## Summary

While migrating from Java to Kotlin is great, there are many subtle differences between the languages that can blindside you and must be taken into account. It's more than likely that these problems may never affect you, but it's probably helpful to know what's up when they do :)
