+++
date = 2022-04-17
lastmod = 2022-04-17
summary = "Gradle's convention plugins are a fantastic way to share common build configuration, why not take them a step further?"
categories = ["gradle"]
slug = "converting-gradle-convention-plugins-to-binary-plugins"
title = "Converting Gradle convention plugins to binary plugins"
tags = ["convention plugins", "gradle"]
+++

### Introduction

Gradle's [convention plugins] are a powerful feature that allow creating simple, reusable Gradle plugins that can be used across your multi-module projects to ensure all modules of a certain type are configured the same way. As an example, if you want to enforce that none of your Android library projects contain a `BuildConfig` class then the convention plugin for it could look something like this:

> `com.example.android-library.gradle.kts`
>
> ```groovy
> plugins {
>   id("com.android.library")
> }
>
> android {
>   buildFeatures {
>     buildConfig = false
>   }
> }
> ```

Then in your modules, you can use this plugin like so:

> `library-module/build.gradle.kts`
>
> ```groovy
> plugins {
>   id ("com.example.android-library")
> }
> ```

## Setting up convention plugins in your project

Gradle's official sample linked above mentions `buildSrc` as the location for your convention plugins. I'm inclined to disagree, `buildSrc` has historically had issues with IDE support and it's special status within Gradle's project handling means any change within `buildSrc` invalidates caches for your **entire** project resulting in incredible amounts of time lost during incremental builds.

The solution to all of these problems is [composite builds], and [Josef Raska has a fantastic article] that thoroughly explains the shortcomings of `buildSrc` and how composite builds solve them.

A full explainer on the topic is slightly out of scope for this post, but I can wholeheartedly endorse Jendrik Johannes' [idiomatic-gradle] repository as an example of setting up the Gradle build of a real-world project while leveraging features introduced in recent versions of Gradle. I highly recommend also checking out their 'Understanding Gradle' [video series].

## Why would you want to make binary plugins out of convention plugins

First, let's answer this: what is a binary plugin?

A Gradle plugin that is resolved as a dependency rather than compiled from source is a binary plugin. Binary plugins are cool because the next best thing after a cached compilation task is one that doesn't exist in the first place.

For most use cases, convention plugins will need to be updated very infrequently. This means that having each developer execute the plugin build as part of their development process is needlessly wasteful, and we can instead just distribute them as maven dependencies.

This also makes it significantly easier to share convention plugins between projects without resorting to historically painful solutions like Git submodules or just straight up copy-pasting.

## Publishing your convention plugins

To their credit, Gradle supports this ability very well and you can actually publish all plugins within a build/project with minimal configuration. The changes required to publish [Android Password Store]'s convention plugins for Android are:

> `build-logic/android-plugins/build.gradle.kts`
>
> ```diff
> -plugins { `kotlin-dsl` }
> +plugins {
> +  `kotlin-dsl`
> +  id("maven-publish")
> +}
> +
> +group = "com.github.android-password-store"
> +
> +version = "1.0.0"
> ```

After that you can run `gradle -p build-logic publishToMavenLocal` and it will Just Work:tm:. You can configure additional publishing repositories in similar fashion to how you'd do it for a library project.

If like me you need to publish these to [Maven Central], you'll need slightly more setup since it enforces multiple security and publishing related best practices. Here's how I use [gradle-maven-publish-plugin] to configure the same (`gradle.properties` changes omitted for brevity, the GitHub repository explains what you need):

> `build-logic/settings.gradle.kts`
>
> ```diff
> +pluginManagement {
> +  repositories {
> +    mavenCentral()
> +    gradlePluginPortal()
> +  }
> +  plugins {
> +    id("com.vanniktech.maven.publish.base") version "0.19.0"
> +  }
> +}
> +
> ```

> `build-logic/android-plugins/build.gradle.kts`
>
> ```diff
> +import com.vanniktech.maven.publish.JavadocJar
> +import com.vanniktech.maven.publish.JavaLibrary
> +import com.vanniktech.maven.publish.MavenPublishBaseExtension
> +import com.vanniktech.maven.publish.SonatypeHost
> +import org.gradle.kotlin.dsl.provideDelegate
> +
> -plugins { `kotlin-dsl` }
> +plugins {
> +  `kotlin-dsl`
> +  id("com.vanniktech.maven.publish.base")
> +  id("signing")
> +}
> +
> +configure<MavenPublishBaseExtension> {
> +  group = requireNotNull(project.findProperty("GROUP"))
> +  version = requireNotNull(project.findProperty("VERSION_NAME"))
> +  publishToMavenCentral(SonatypeHost.DEFAULT)
> +  signAllPublications()
> +  configure(JavaLibrary(JavadocJar.Empty()))
> +  pomFromGradleProperties()
> +}
> +
> + afterEvaluate {
> +  signing {
> +    val signingKey: String? by project
> +    val signingPassword: String? by project
> +    useInMemoryPgpKeys(signingKey, signingPassword)
> +  }
> + }
> ```

This will populate your POM files with the properties required by Maven Central and sign all artifacts with PGP.

## Consuming your new binary plugins

With your convention plugins converted to shiny new binary plugins, you might be inclined to start using them like so:

> `autofill-parser/build.gradle.kts`
>
> ```diff
>  plugins {
> -  id("com.github.android-password-store.published-android-library")
> -  id("com.github.android-password-store.kotlin-android")
> -  id("com.github.android-password-store.kotlin-library")
> -  id("com.github.android-password-store.psl-plugin")
> +  id("com.github.android-password-store.published-android-library") version "1.0.0"
> +  id("com.github.android-password-store.kotlin-android") version "1.0.0"
> +  id("com.github.android-password-store.kotlin-library") version "1.0.0"
> +  id("com.github.android-password-store.psl-plugin") version "1.0.0"
>  }
> ```

However, this fails because `kotlin-android` and `kotlin-library` plugins resolve to the same binary JAR that encompasses all plugins from the `build-logic/kotlin-plugins` module and results in a classpath conflict. To better understand how this resolution works, check out the docs on [plugin markers].

The way to resolve this problem is to define the plugin versions in your `settings.gradle.kts` file, where these classpath conflicts will be resolved automatically by Gradle:

> `settings.gradle.kts`
>
> ```diff
> @@ -14,6 +14,25 @@ pluginManagement {
>      mavenCentral()
>      gradlePluginPortal()
>    }
> +  plugins {
> +    id("com.github.android-password-store.kotlin-android") version "1.0.0"
> +    id("com.github.android-password-store.kotlin-library") version "1.0.0"
> +    id("com.github.android-password-store.psl-plugin") version "1.0.0"
> +    id("com.github.android-password-store.published-android-library") version "1.0.0"
> +  }
>  }
> ```

And you're off to the races!

## Closing notes

This post was motivated by my goal of sharing a common set of Gradle configurations across my projects such as [Android Password Store] and [Claw], which maintain a nearly identical set of convention plugins shared between the projects that I manually copy-paste back and forth. I've extracted the `build-logic` subproject of APS to a separate [aps-build-logic] repository, set it up for standalone development and configured publishing support. My goal is to supplement this with a continuous deployment workflow where an automatic version bump + release happens after each commit to the main, after which I can migrate my projects to it.

[convention plugins]: https://docs.gradle.org/current/samples/sample_convention_plugins.html
[composite builds]: https://docs.gradle.org/current/userguide/composite_builds.html
[josef raska has a fantastic article]: https://proandroiddev.com/stop-using-gradle-buildsrc-use-composite-builds-instead-3c38ac7a2ab3
[idiomatic-gradle]: https://github.com/jjohannes/idiomatic-gradle
[video series]: https://github.com/jjohannes/understanding-gradle#readme
[android password store]: https://msfjarvis.dev/aps
[maven central]: https://search.maven.org/
[gradle-maven-publish-plugin]: https://github.com/vanniktech/gradle-maven-publish-plugin
[plugin markers]: https://docs.gradle.org/current/userguide/plugins.html#sec:plugin_markers
[claw]: https://msfjarvis.dev/g/compose-lobsters
[aps-build-logic]: https://msfjarvis.dev/g/aps-build-logic
