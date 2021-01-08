+++
categories = ["android", "kotlin", "gradle"]
date = 2021-01-05
description = "Gradle offers buildSrc as a fantastic way of sharing common build logic across modules. Let's see how we can use it to configure our multi-module Android builds with ease."
draft = true
slug = "configuring-your-android-builds-with-buildsrc"
tags = ["buildSrc", "gradle plugin"]
title = "Configuring your Android builds with buildSrc"
+++

With the introduction of the Gradle Kotlin DSL a while ago and the more recent [performance improvements] to massively improve its compile times, it is a good time to consider using buildSrc for configuring your builds.

The simplest way to do this is through a [precompiled script plugin], where you create a Gradle plugin to your `buildSrc` directory itself as opposed to including it from a remote repository.


## Creating your first Gradle plugin

In its most basic form, a Gradle plugin is just an implementation of the `Plugin<T>` class:

```kotlin
package com.example

import org.gradle.api.Plugin
import org.gradle.api.Project

class ExamplePlugin : Plugin<Project> {
  override fun apply(target: Project) {
  }
}
```

To make this `ExamplePlugin` available to your modules, register it as a plugin in your `buildSrc/build.gradle.kts`

```kotlin
gradlePlugin {
  plugins {
    register("example") {
      id = "example-plugin"
      implementationClass = "com.example.ExamplePlugin"
    }
  }
}
```

To use it from a module, add `example-plugin` to the `plugins` block.

```kotlin
plugins {
  id("com.android.application)
  kotlin("android")
  `example-plugin`
}
```

To confirm it's working, add a print statement to the body of `apply` and run `./gradlew tasks`. As the build enters the configuration phase, you will see your print statement get executed.

And that's about all you need to do for getting a Gradle plugin going. Let's see how to make this plugin do some more interesting things.

## Configuring the project based on other applied plugins

In our example, we also have the `com.android.application` plugin applied. We can use that information in our custom plugin to configure our project. First, let's set up the necessary bits that let us discover the application plugin in our project.

```diff
package com.example

+import com.android.build.gradle.internal.plugins.AppPlugin
import org.gradle.api.Plugin
import org.gradle.api.Project

class ExamplePlugin : Plugin<Project> {
  override fun apply(target: Project) {
+    target.plugins.all {
+      when(this) {
+        AppPlugin -> {
+          TODO("We will be doing things here when the app plugin is applied")
+        }
+      }
+    }
  }
}
```

To see if this is working, try running `./gradlew tasks` again. It should cause the build to fail when configuring the app project because of the `TODO()` method.

[precompiled script plugin]: https://docs.gradle.org/current/userguide/custom_plugins.html#sec:precompiled_plugins
[performance improvements]: https://docs.gradle.org/current/release-notes.html#performance-improvements
