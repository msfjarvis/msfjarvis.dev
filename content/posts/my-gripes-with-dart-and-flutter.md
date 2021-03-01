+++
categories = ["dart", "flutter", "android"]
date = 2021-02-25
description = "I've had the chance to explore Flutter (and Dart) at work for the past few weeks and I have opinions :tm:"
draft = true
slug = "my-gripes-with-dart-and-flutter"
tags = ["androiddev", "dart", "flutter", "kotlin"]
title = "My gripes with Dart and Flutter"
+++

Before you tear into me on Hacker News and this comments section, I'm going to go ahead and enlist my biases from before I approached Flutter.

- I am an Android developer with Java and Kotlin proficiency, and my first foray into declarative UI was [Jetpack Compose]
- I have used and disliked JavaScript in the past, and am aware that Google intended to ship the Dart VM in Chrome back in 2015 as a JS competiter
- I am a huge fan of strongly typed languages, especially ones with powerful type systems like TypeScript and Rust, both of which I use and enjoy using.

With that out of the way, let's dive in.

## Hot reload is great! (when it works)

Not much to say there, it really is great! The lack of IDE support for previewing your UIs is more than made up by being able to press one key and see it on your device within seconds. The catch: it requires you to use a debug build which have janky performance, and sometimes borderline unusable levels of UI sluggishness depending on how many widgets you have on your screen. Also, subsequent hot reloads seem to exexacerbate the performance woes to the point where 4-5 hot reloads in you will need to restart your app to have things move on the screen again.

However, I can say for a fact that being able to press 'r' on the keyboard and being immediately guaranteed that the code you wrote is what generated the UI you're seeing is great. No more "okay I'll do a clean rebuild and see if my changes show up" which, while a **lot** less frequent now, continues to be a thing in Android.

## TL;DR

Flutter is a generally pleasant way to build cross-platform apps, but Dart and the some of the tooling around the language feel like they hold Flutter back. Again, I'm a biased commentator because of my JVM/Android experiences so it is entirely possible I'm just deluded. I'll let you be the judge of it :)

[Jetpack Compose]: https://d.android.com/jetpack/compose
