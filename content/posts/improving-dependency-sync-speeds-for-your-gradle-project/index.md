+++
title = "Improving dependency sync speeds for your Gradle project"
date = "2024-03-30T21:43:07.031Z"
summary = "Waiting for Gradle to download dependencies is so 2023"
categories = ["gradle"]
tags = ["gradle", "kotlin-multiplatform", "perf"]
images = [ "gradle-social.webp" ]
draft = false
+++
Android developers are intimately familiar with the ritual of staring at your IDE for tens of minutes while Gradle imports a new project before they can start working on it. While not fully avoidable, there are many ways to improve the situation. For small to medium projects, the time spent on this import phase can be largely dominated by dependency downloads.

## Preface

This post is going to assume some things about you and your project, but you should be fine even if these aren't true for you.

- You're somewhat comfortable mucking around with Gradle
- Your project is using Gradle 8.7, the latest as of writing

If you're stuck on a lower version of Gradle, you will hit [this bug] with the code samples in the post. Replacing all calls to `includeGroupAndSubgroups` with `includeGroupByRegex` can let you work around it temporarily (Note the addition of the `.*` at the end):

```diff
- includeGroupAndSubgroups("com.example")
+ includeGroupByRegex("com.example.*")
```

## Obtaining a baseline

To get an idea for how long it actually takes your project to fetch its dependencies and to establish a baseline to compare improvements again, we can leverage Android Studio's relatively new [Downloads Info] view to see how many network requests are being made and how many of those are failing and contributing to our slower build. Gradle has a `--refresh-dependencies` flag which ignores its existing cache of downloaded dependencies and redownloads them from the remote repositories which will allow us to get consistent results, barring network and disk fluctuations.

In Android Studio, create a new run configuration for Gradle's in-built `dependencies` task that will resolve all configurations and give us a more representative number. The `--refresh-dependencies` flag will force a full re-download to ensure caches do not affect our benchmarks:

{{< figure src="run-configuration.webp" title="The Android Studio Run configuration window configured with the task ':android:dependencies --refresh-dependencies'" >}}

When you run this task, you'll see the Build tool window at the bottom get populated with logs of Gradle downloading dependencies and the Downloads info tab will start accumulating the statistics for it.

{{< figure src="download-info.webp" title="Download info window showing a list of network requests and their sources while the task is running" >}}

## How Gradle fetches your dependencies

The Gradle documentation for [dependency resolution] explains in some depth how the version conflict resolution and caching systems work, but that's pretty jargon-heavy and too much of a detour from what we're really here to do so I'll just Spark Notes™️ it and move on to more fun stuff.

- Gradle requires declaring **repositories** where dependencies are fetched from.
- Dependencies are looked up in each repository, **in declaration order**, until they are found in one.
- Gradle makes a lot of network requests as part of this lookup, and it is in our interest to reduce them.

## A quick attempt at optimisation

In the previous section I started off by mentioning **repositories**, which define _where_ Gradle will look for dependencies. The repositories setup for a typical Android project might look something like this:

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
    maven("https://jitpack.io") { name = "JitPack" }
    google()
    mavenCentral()
    maven("https://oss.sonatype.org/content/repositories/snapshots/") {
      name = "Sonatype snapshots
    }
  }
}
```

This tells Gradle that you want plugin dependencies to be looked up from [Maven Central] and [gMaven], and for all other dependencies to come from [JitPack], [gMaven], [Maven Central], or the [Maven Central snapshots] repository; **in that order**. The first simple tweak you can make is to reorder these based on how many of your dependencies you expect to come from what repository.

For example, in a typical Android build most of your plugin classpath will be dominated by the Android Gradle Plugin (AGP), so you'd want gMaven to be come first so that Gradle does not waste time trying to find AGP on Maven Central.

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
-    maven("https://jitpack.io") { name = "JitPack" }
     google()
     mavenCentral()
+    maven("https://jitpack.io") { name = "JitPack" }
     maven("https://oss.sonatype.org/content/repositories/snapshots/") {
       name = "Sonatype snapshots
     }
   }
 }
```

## Going for zero

With the minor changes made above we have already significantly improved on our failed requests metric, but why stop at good when we can have _perfect_.

Gradle's repositories APIs also support the notion of specifying the expected "contents" of individual repositories, which tells Gradle what groups of dependencies are supposed to be available in what repositories. This allows it to prevent redundant network requests and significantly boosts sync performance.

These filters can be of two types:

- Declaring that certain artifacts can _only_ be resolved from certain repositories: [`exclusiveContent`]
- Declaring that a repository _only_ contains certain artifacts: [`content`]

The difference is subtle, but should become clearer shortly as we start hacking on our setup.

For our plugins block, we want only gMaven to supply AGP and everything else can come from Maven Central. Here's how to achieve that:

```diff
 // settings.gradle.kts
 pluginManagement {
   repositories {
-    google()
+    exclusiveContent { // First type of filter
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

For other dependencies that are governed by the `dependencyResolutionManagement` block, the setup is similar. To demonstrate the usage of the second kind of filter, we're introducing an additional constraint: assume the build relies on the [Jetpack Compose Compiler], and we go back and forth between stable and pre-release builds of it. The pre-release builds can only be obtained from [androidx.dev], while the stable builds only exist on [gMaven]. If we tried to use `exclusiveContent` here, it would make Gradle only check one of the declared repositories for the artifact and fail if it doesn't find it there. To allow this fallback, we instead use a `content` filter as follows.

```diff
 dependencyResolutionManagement {
   repositories {
-    google()
+    google {
+      content {
+        includeGroupAndSubgroups("androidx")
+        includeGroupAndSubgroups("com.android")
+        includeGroupAndSubgroups("com.google")
+      }
+    }
+    maven("https://androidx.dev/storage/compose-compiler/repository") {
+      name = "Compose Compiler Snapshots"
+      content { includeGroup("androidx.compose.compiler") }
+    }
     mavenCentral()
     maven("https://jitpack.io") { name = "JitPack" }
     maven("https://oss.sonatype.org/content/repositories/snapshots/") {
       name = "Sonatype snapshots
     }
   }
 }
```

This setup tells Gradle the specific artifacts present in these repositories but does not enforce any restrictions on which repository said artifacts can come from. Now, if I use a pre-release version of the Compose Compiler, Gradle will first try to look it up in [gMaven] and then fall back to the `androidx.dev` repository.

In the above example we also see [JitPack] being mentioned, which we only wish to use for a specific dependency that's unavailable elsewhere. The [`exclusiveContent`] filter is precisely for this use case:

```diff
dependencyResolutionManagement {
  repositories {
    google {
      content {
        includeGroupAndSubgroups("androidx")
        includeGroupAndSubgroups("com.android")
        includeGroupAndSubgroups("com.google")
      }
    }
    maven("https://androidx.dev/storage/compose-compiler/repository") {
      name = "Compose Compiler Snapshots"
      content { includeGroup("androidx.compose.compiler") }
    }
    mavenCentral()
-    maven("https://jitpack.io") { name = "JitPack" }
+    exclusiveContent {
+      forRepository { maven("https://jitpack.io") { name = "JitPack" } }
+      filter { includeGroup("com.github.requery") }
+    }
    maven("https://oss.sonatype.org/content/repositories/snapshots/")
  }
}
```

The Sonatype OSS snapshots repository is only intended to be used for snapshot releases of dependencies we'd otherwise source from Maven Central, so we can indicate to Gradle to only search for snapshots in there with a [`mavenContent`] directive:

```diff
dependencyResolutionManagement {
  repositories {
    google {
      content {
        includeGroupAndSubgroups("androidx")
        includeGroupAndSubgroups("com.android")
        includeGroupAndSubgroups("com.google")
      }
    }
    maven("https://androidx.dev/storage/compose-compiler/repository") {
      name = "Compose Compiler Snapshots"
      content { includeGroup("androidx.compose.compiler") }
    }
    mavenCentral()
    maven("https://jitpack.io")
    exclusiveContent {
      forRepository { maven("https://jitpack.io") { name = "JitPack" } }
      filter { includeGroup("com.github.requery") }
    }
    maven("https://oss.sonatype.org/content/repositories/snapshots/") {
      name = "Sonatype Snapshots"
+     mavenContent {
+       snapshotsOnly()
+     }
    }
  }
}
```

### Bonus section: Kotlin Multiplatform

If you're working with Kotlin Multiplatform, these directions will sadly not cover all the dependencies being fetched during your build. There's a YouTrack issue ([KT-51379]) that you can subscribe to for updates on this, but in the mean time here's the missing bits:

```kotlin
dependencyResolutionManagement {
  repositories {
    // workaround for https://youtrack.jetbrains.com/issue/KT-51379
    exclusiveContent {
      forRepository {
        ivy("https://download.jetbrains.com/kotlin/native/builds") {
          name = "Kotlin Native"
          patternLayout {
            listOf(
                "macos-x86_64",
                "macos-aarch64",
                "osx-x86_64",
                "osx-aarch64",
                "linux-x86_64",
                "windows-x86_64",
              )
              .forEach { os ->
                listOf("dev", "releases").forEach { stage ->
                  artifact("$stage/[revision]/$os/[artifact]-[revision].[ext]")
                }
              }
          }
          metadataSources { artifact() }
        }
      }
      filter { includeModuleByRegex(".*", ".*kotlin-native-prebuilt.*") }
    }
    exclusiveContent {
      forRepository {
        ivy("https://nodejs.org/dist/") {
          name = "Node Distributions at $url"
          patternLayout { artifact("v[revision]/[artifact](-v[revision]-[classifier]).[ext]") }
          metadataSources { artifact() }
          content { includeModule("org.nodejs", "node") }
        }
      }
      filter { includeGroup("org.nodejs") }
    }
    exclusiveContent {
      forRepository {
        ivy("https://github.com/yarnpkg/yarn/releases/download") {
          name = "Yarn Distributions at $url"
          patternLayout { artifact("v[revision]/[artifact](-v[revision]).[ext]") }
          metadataSources { artifact() }
          content { includeModule("com.yarnpkg", "yarn") }
        }
      }
      filter { includeGroup("com.yarnpkg") }
    }
  }
}
```

If you're not using a JavaScript target in your project, it should be safe to skip the NodeJS and Yarn repositories but it's probably easier to keep it configured ahead of time in case you adopt JavaScript in the future.

## Conclusion

The exact percentage improvement you can expect can vary depending on how many dependencies you have as well as how many repositories were previously declared and in what order, but you should most definitely see a noticeable difference consistently. These are the before and after numbers for a project I optimised for my day job.

### Before

{{< figure src="before-fixes.webp" title="The Android Studio Dependency Sync window, showing a total sync duration of 5 minutes and 56 seconds of which 1 minute and 30 seconds went into failed network requests" >}}

### After

{{< figure src="after-fixes.webp" title="The Android Studio Dependency Sync window, now showing the total sync taking only 3 minutes and 17 seconds with 0 failed requests" >}}

Like and subscribe, and hit that notification bell so you don't miss my next post some time within this decade (hopefully).

[downloads info]: https://developer.android.com/studio/releases/past-releases/as-giraffe-release-notes#download-info-sync
[pom]: https://maven.apache.org/pom.html
[gradle module metadata]: https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html
[dependency resolution]: https://docs.gradle.org/current/userguide/dependency_resolution.html#sec:how-gradle-downloads-deps
[configurations]: https://docs.gradle.org/current/userguide/declaring_dependencies.html
[version catalog]: https://docs.gradle.org/current/userguide/platforms.html#sub:central-declaration-of-dependencies
[maven central]: https://repo1.maven.org/maven2/
[maven central snapshots]: https://oss.sonatype.org/content/repositories/snapshots/com/squareup/sqldelight/
[gMaven]: https://maven.google.com/web/index.html
[jitpack]: https://jitpack.io
[jetpack compose compiler]: https://developer.android.com/jetpack/androidx/releases/compose-compiler
[`content`]: https://docs.gradle.org/current/kotlin-dsl/gradle/org.gradle.api.artifacts.repositories/-artifact-repository/content.html?query=abstract%20fun%20content(configureAction:%20Action%3Cout%20Any%3E)
[`mavencontent`]: https://docs.gradle.org/current/kotlin-dsl/gradle/org.gradle.api.artifacts.repositories/-maven-artifact-repository/maven-content.html?query=abstract%20fun%20mavenContent(configureAction:%20Action%3Cout%20Any%3E)
[`exclusivecontent`]: https://docs.gradle.org/current/kotlin-dsl/gradle/org.gradle.api.artifacts.dsl/-repository-handler/exclusive-content.html?query=abstract%20fun%20exclusiveContent(action:%20Action%3Cout%20Any%3E)
[KT-51379]: https://youtrack.jetbrains.com/issue/KT-51379
[androidx.dev]: https://androidx.dev/storage/compose-compiler/repository
[this bug]: https://github.com/gradle/gradle/issues/26569
