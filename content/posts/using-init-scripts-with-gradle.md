+++
categories = ["android", "kotlin"]
date = 2021-02-09
description = "Initialization scripts are a powerful Gradle feature that allow customizing the build based on the current environment"
draft = true
slug = "using-init-scripts-with-gradle"
socialImage = "/uploads/gradle-social.webp"
tags = ["gradle", "android", "kotlin", "gradle init scripts"]
title = "Init scripts in Gradle"
+++

First of all, as the [official Gradle documentation] states, "init scripts" are not the same thing as the `gradle init` command that initializes a new Gradle build in the current directory.


# What are init scripts?

They are regular build scripts seen elsewhere in Gradle, but are executed *before* the build starts. They can be used to register external listeners, add plugins to the build or specify machine-specific properties such as the location of a particular SDK required to build the project.


# Using init scripts, the official way

Gradle recommends using init scripts with the `--init-script` flag on each Gradle invocation. For example, you might want to include a couple extra tasks for yourself in a Gradle build without modifying the source of the project. To do this, define whatever you want in a separate Gradle file that will be used as an init script.

```kotlin
// init.gradle.kts
class EvaluationListenerPlugin : Plugin<Gradle> {
	override fun apply(target: Gradle) {
		target.projectsEvaluated {
			println("Project evaluation completed")
		}
	}
}

apply<EvaluationListenerPlugin>()
```

Then it can be used like this

```
$ gradle --init-script init.gradle.kts
```

and somewhere in the output you'll see our "Project evaluation completed" line.

However, you can also use them to apply common configurations to *every* Gradle project on your machine, *automatically*.

# (Ab)using init scripts for fun and profit

Linux users might be familiar with the `/etc/init.d/` directory, that lets you run arbitrary scripts during the boot process. Gradle comes with a similar setup for init scripts at `$GRADLE_USER_HOME/init.d` (`GRADLE_USER_HOME` is by default the `$HOME/.gradle` directory).

So, what can you add here? Almost anything!

On my machines, I currently have two init scripts. One that automatically adds Ben Manes' [gradle-versions-plugin] (also where I first discovered init scripts!), and another that does the same for Miłosz Lewandowski's [can-i-drop-jetifier]. The scripts look something like this

```kotlin
// $HOME/.gradle/init.d/can-i-drop-jetifier.gradle.kts

initscript {
  repositories {
    gradlePluginPortal()
  }
  dependencies {
    classpath("com.github.plnice:canidropjetifier:0.5")
  }
}

allprojects {
  apply<com.github.plnice.canidropjetifier.CanIDropJetifierPlugin>()
}
```

You'll notice that the `apply` syntax is using the actual class name rather than just the plugin name, which I believe is the only way to actually apply plugins from an init script.

# Caveats

Like everything in software, there are some problems you might run into, specifically with the `init.d`-based setup.

Since applying a plugin now requires knowing the plugin class, you'll need to do some digging into each plugin's source code that you wish to apply. A quick way to find it is searching for `Plugin<Project>` in the GitHub repository which will locate plugin classes.

If a project already has a plugin applied that you have configured in your `$GRADLE_USER_HOME/init.d` directory, it will fail the build with a classpath clash. The solution is to either rename the file in `init.d` to prevent it from being picked up by Gradle (`mv can-i-drop-jetifier.gradle can-i-drop-jetifier.gradle.disabled`), or to temporarily remove it from the project in question.

If you have an actual solution for this, please let me know on [Twitter] or post a comment below :)


[official Gradle documentation]: https://docs.gradle.org/6.8.2/userguide/init_scripts.html
[gradle-versions-plugin]: https://github.com/ben-manes/gradle-versions-plugin
[can-i-drop-jetifier]: https://github.com/plnice/can-i-drop-jetifier
[twitter]: https://twitter.com/msfjarvis
