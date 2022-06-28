+++
categories = ["android", "gradle", "kotlin"]
date = 2022-06-26
summary = "Paparazzi enables a radically faster and improved UI testing workflow, and using a small workaround we can bring that to our multiplatform Compose projects"
slug = "writing-paparazzi-tests-for-your-kotlin-multiplatform-projects"
tags = ["jetpack-compose", "kotlin-multiplatform"]
title = "Writing Paparazzi tests for your Kotlin Multiplatform projects"
+++

## Introduction

[Paparazzi] is a Gradle plugin and library that enables writing UI tests for Android screens that run entirely on the JVM, without needing a physical device or emulator. This is massive, since it significantly increases the speed of UI tests as well as allows them to run on any CI system, not just ones using macOS or Linux with KVM enabled.

Unfortunately, Paparazzi does not directly work with Kotlin Multiplatform projects so you cannot apply it to a KMP + Android module and start putting your tests in the `androidTest` source set (not to be confused with `androidAndroidTest`. Yes, I know). Why would you want to do this in the first place? Like everything cool and new in Android land, [Compose]! Specifically, [compose-jb], JetBrains' redistribution of Jetpack Compose optimised for Kotlin Multiplatform.

I've [sent a PR] to Paparazzi that will resolve this issue, and in the mean time we can workaround this limitation.

## Setting things up

To begin, we'll need a new Gradle module for our Paparazzi tests. Since Paparazzi doesn't understand Kotlin Multiplatform yet, we're gonna hide that aspect of our project and present it a pure Android library project. Set up the module like so:

```plain
// paparazzi-tests/build.gradle.kts
plugins {
  id("com.android.library")
  id("app.cash.paparazzi")
}

android {
  buildFeatures { compose = true }
}
```

Now, add dependencies in this module to the modules that contain the composables you'd like to test. As you might have guessed, this approach currently limits you to only being able to test public composables. However, if you're trying to test the UI exposed by a "common" module like I am, that might not be such a big deal.

```plain
// paparazzi-tests/build.gradle.kts
dependencies {
  testImplementation(projects.common)
}
```

And that's pretty much it! You can now be off to the races and start writing your tests:

```plain
// paparazzi-tests/src/test/kotlin/UserProfileTest.kt
class UserProfileTest {
  @get:Rule val paparazzi = Paparazzi()

  @Test
  fun light_mode() {
    paparazzi.snapshot {
      MaterialTheme(colorScheme = LightThemeColors) { UserProfile() }
    }
  }

  @Test
  fun dark_mode() {
    paparazzi.snapshot {
      MaterialTheme(colorScheme = DarkThemeColors) { UserProfile() }
    }
  }
}
```

Consult the [Paparazzi documentation] for the Gradle tasks reference and customization options.

## Recipes

### Disable release build type for test module

If you use `./gradlew check` in your CI, our new module will be tested in both release and debug build types. This is fairly redundant, so you can disable the release build type altogether:

```plain
// paparazzi-tests/build.gradle.kts
androidComponents {
  beforeVariants { variant ->
    variant.enable = variant.buildType == "debug"
  }
}
```

### Running with JDK 12+

You will run into [this issue] if you use JDK 12 or above to run Paparazzi-backed tests. I've [started working] on a fix for it upstream, in the mean time it can be worked around by forcing the test tasks to run with JDK 11.

```plain
// paparazzi-tests/build.gradle.kts
tasks.withType<Test>().configureEach {
  javaLauncher.set(javaToolchains.launcherFor {
    languageVersion.set(JavaLanguageVersion.of(11))
  })
}
```

### Testing with multiple themes easily

Using an enum and Google's [TestParameterInjector] you can write a single test and have it run against all your themes.

```plain
// paparazzi-tests/src/test/kotlin/Theme.kt
import androidx.compose.material3.ColorScheme

enum class Theme(val colors: ColorScheme) {
  Light(LightThemeColors),
  Dark(DarkThemeColors),
}
```

```plain
// paparazzi-tests/src/test/kotlin/UserProfileTest.kt
@RunWith(TestParameterInjector::class)
class UserProfileTest {
  @get:Rule val paparazzi = Paparazzi()

  @Test
  fun verify(@TestParameter theme: Theme) {
    paparazzi.snapshot(name = theme.name) {
      MaterialTheme(colorScheme = theme.colors) { UserProfile() }
    }
  }
}
```

[paparazzi]: https://github.com/cashapp/paparazzi
[compose]: https://d.android.com/jetpack/compose
[compose-jb]: https://github.com/jetbrains/compose-jb
[sent a pr]: https://github.com/cashapp/paparazzi/pull/450
[paparazzi documentation]: https://cashapp.github.io/paparazzi
[this issue]: https://github.com/cashapp/paparazzi/issues/409
[started working]: https://github.com/cashapp/paparazzi/pull/474
[testparameterinjector]: https://github.com/google/TestParameterInjector
