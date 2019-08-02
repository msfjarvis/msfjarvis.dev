+++
date = "2019-07-17"
title = "Collections in programming languages"
slug = "collections-in-programming-languages"
tags = []
categories = []
+++

Collections are a very fundamental and interesting feature in programming. Putting together "many of the same" is important in real world applications such as a Hangman game, as a familiar example.

You need to have an *ordered* collection of letters and blanks that form the word to be guessed, as well as another collection of letters that have been already guessed.

Time for the nitty-gritty now.

> Note: The following post will be using Java/Kotlin's (JVM's?) collections since they seem to have the most types of collections among the programming languages I am proficient in.


For simplicity, I'll be using the Java SE 7 API reference as the baseline for all the explanations here. The discussion itself will strive to remain language-agnostic so please do not be discouraged away if you are not a JVM developer.

### Sets

> A Set, in mathematical terms, is a collection of distinct objects, and is considered an object in its own right.

Let's dive into this.

When we say <span style="text-decoration:underline">_distinct objects_</span>, it simply means that duplication is forbidden. For any two elements `e1` and `e2`, `e1 == e2` can **never** be true in a valid set.

In most languages, sets are also guaranteed to be **ordered**, i.e., the elements shall remain in the order you inserted them initially.


So that was sets. Simple enough right?