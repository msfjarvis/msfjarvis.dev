---
title: Improving dependency sync speeds for your Gradle project
date: 2023-12-09T14:46:07.031Z
summary: Waiting for Gradle to download dependencies before your IDE becomes
  usable is a constant pain for developers. Here are some tips to speed up that
  process.
draft: true
---
Android developers are intimately familiar with the ritual of staring at your IDE for tens of minutes while Gradle imports the project before they can start working. While not fully avoidable, there are many ways to improve the situation. For small to medium projects, the time spent on this import phase is largely dominated by dependency downloads.

## Obtaining a baseline

To get an idea for how long it actually takes your project to fetch its dependencies and to establish a baseline to compare improvements again, we can leverage Android Studio's relatively new [Downloads Info] view to see how many network requests are being made and how many of those are failing and contributing to our slower build. Gradle has a `--refresh-dependencies` flag which ignores its existing cache of downloaded dependencies and redownloads them from the remote repositories which will allow us to get consistent results, barring network and disk fluctuations.

In Android Studio, create a new run configuration with a commonly used task that will require your entire dependency tree, such as `assembleDebug` and specify the `--refresh-dependencies` flag so that it looks like this:

// insert Run configuration window screenshot

When you run this task, you'll see the Build tool window at the bottom get populated with logs of Gradle downloading dependencies and the Downloads info tab will start accumulating the statistics for it. Once the task is complete, you should end up with something that looks like this:

// insert Download info tool window screenshot

## How Gradle fetches your dependencies

Gradle's dependency resolution relies on a set of user-defined repositories that are used to search for the requested dependencies, from where it will obtain the [POM] or [Gradle Module Metadata] to identify the dependencies of that dependency. This keeps happening in a recursive fashion until there is a full [Directed Acyclic Graph] of dependencies where the terminal nodes are dependencies with no other child deps.

Once this graph has been computed, Gradle will start downloading them as and when specific [configurations] are requested by the build itself. For the purposes of this article, you don't need to know too much about configurations other than the fact that when you write `implementation(libs.androidx.core)` in your buildscript, `implementation` is the configuration to which you're adding the dependency specified by the `androidx-core` key in your [version catalog].

## A quick attempt at optimisation

In the previous section I started off by mentioning **repositories**, which define *where* Gradle will look for dependencies. The repositories setup for a typical Android project might look something like this:

```kotlin
// settings.gradle.kts
pluginManagement {
  repositories {
    mavenCentral()
    google()
  }
}

dependencyResolutionManagement {
  repositories {
    maven("https://jitpack.io")
    google()
    mavenCentral()
    maven("https://oss.sonatype.org/content/repositories/snapshots/")
  }
}
```

This tells Gradle that you want plugin dependencies to be looked up from [Maven Central] and [gMaven], and for all other dependencies to come from [JitPack], [gMaven], [Maven Central], or the [Maven Central snapshots] repository; **in that order**. This ordering is crucial, because the first
simple tweak you can make is to reorder these based on what part of your dependencies you expect to come from what repository.

For example, in a typical Android build most of your plugin classpath will be dominated by the Android Gradle Plugin (AGP), so you'd want gMaven to be come first so that Gradle does not try to find it on Maven Central.

```diff
 pluginManagement {
   repositories {
-    mavenCentral()
     google()
+    mavenCentral()
   }
 }
```

For the `dependencyResolutionManagement` block, JitPack is very likely to only host one or two of the dependencies you require, while most of them will be coming from gMaven and Maven Central, so shifting JitPack to the very end will significantly reduce the number of failed requests.

```diff
 dependencyResolutionManagement {
   repositories {
-    maven("https://jitpack.io")
     google()
     mavenCentral()
+    maven("https://jitpack.io")
     maven("https://oss.sonatype.org/content/repositories/snapshots/")
   }
 }
```

## Going for zero

With the minor changes made above we have already significantly improved on our failed requests metric, but why stop at good when we can have *perfect*.

Gradle's repositories APIs also support the notion of specifying the expected "contents" of individual repositories, which tells Gradle what groups of dependencies are supposed to be available in what repositories. This allows it to prevent redundant work and significantly boosts sync performance.

There are two major distinctions that can be expressed for such filters:

* Declaring that a repository *only* contains certain dependencies
* Declaring that certain dependencies can *only* be resolved from certain repositories

The difference is subtle, but should become clearer shortly as we start hacking on our setup.

For our plugins block, we want gMaven to supply AGP and everything else can come from Maven Central. Here's how to achieve that:

```diff
 // settings.gradle.kts
 pluginManagement {
   repositories {
-    google()
+    exclusiveContent { // Filter of the first kind
+      forRepository { google() } // Specify the repository this applies to
+      filter { // Start specifying what dependencies are *only* found in this repo
+        includeGroupAndSubgroups("androidx")
+        includeGroupAndSubgroups("com.android")
+        includeGroup("com.google.testing.platform")
+      }
+    }
     mavenCentral()
   }
 }
```

The `includeGroupsAndSubgroups` API used above is a very recent addition, so make sure you're using the current Gradle release.

[downloads info]: https://developer.android.com/studio/releases/past-releases/as-giraffe-release-notes#download-info-sync
[pom]: https://maven.apache.org/pom.html
[gradle module metadata]: https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html
[directed acyclic graph]: https://en.wikipedia.org/wiki/Directed_acyclic_graph
[configurations]: https://docs.gradle.org/current/userguide/declaring_dependencies.html
[version catalog]: https://docs.gradle.org/current/userguide/platforms.html#sub:central-declaration-of-dependencies
[maven central]: https://repo1.maven.org/maven2/
[gMaven]: https://maven.google.com/web/index.html
[jitpack]: https://jitpack.io
