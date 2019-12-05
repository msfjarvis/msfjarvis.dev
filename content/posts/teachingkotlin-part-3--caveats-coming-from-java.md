+++
categories = ["kotlin", "dev", "android", "teachingkotlin"]
date = 2019-12-04T04:35:45Z
description = "Part 3 of #TeachingKotlin covers some subtle differences between Kotlin and Java that might affect your codebases as you start migrating to or writing new code in Kotlin."
draft = true
slug = "teachingkotlin-part-3--caveats-coming-from-java"
tags = ["android", "teachingkotlin", "kotlin"]
title = "#TeachingKotlin Part 3 - Caveats coming from Java"

+++
When you start migrating your Java code to Kotlin, you will encounter multiple subtle changes that might catch you off guard. I'll document some of these gotchas that I and other people I follow have found and written about.

## Splitting strings

Java's `java.lang.String#split` [method](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#split-java.lang.String-) takes a `String` as it's first argument and creates a `Regex` out of it before attempting to split. Kotlin, however, has two variants of this method. One takes a `String` and uses it as a plaintext delimiter, and the other takes a `Regex` behaving like the Java method we mentioned earlier. Code that was directly converted from Java to Kotlin will fail to accommodate this difference, so be on the lookout.

{{< tweet 1202077283579826176 >}}