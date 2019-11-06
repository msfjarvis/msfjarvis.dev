+++
categories = []
date = 2019-10-25T20:23:00Z
slug = "why-i-went-back-to-the-gradle-groovy-dsl"
tags = []
title = "Why I went back to the Gradle Groovy DSL"

+++
About an year ago when I first discovered the [Gradle Kotlin DSL](https://docs.gradle.org/current/userguide/kotlin_dsl.html), I was very quick to [jump](https://github.com/msfjarvis/viscerion/commit/c16d11a816c3c7e3f7bab51ef2f32569b6b657bf) [on](https://github.com/android-password-store/Android-Password-Store/commit/3c06063153d0b7f71998128dc6fb4e5967e33624) [that](https://github.com/substratum/substratum/commit/ebff9a3a88781d093565526b171d9d5b8e9c1bed) [train](https://github.com/substratum/substratum/commit/5065e082055cde19e41ee02920ca07d0e33c89f5). Now it feels like a mistake.

The initial premise of the Gradle Kotlin DSL was very cool. You get first class code completion in the IDE, and you get to write Kotlin rather than the arguably weird Groovy. People were excited to finally be able to write complex build logic using the `buildSrc` functionality that this change introduced.

However the dream slowly started fading as more and more people started using the Kotlin DSL and the shortcomings became more apparent. My grievances with the Kotlin DSL are multifold as I'll detail below.

Just a disclaimer, This post is not meant to completely trash the Kotlin DSL's usability. It has it's own very great benefits and people who leverage those should continue using it and disregard this post :-)

### Build times

The Gradle Kotlin DSL inflates build times _significantly_. Compiling `buildSrc` and all the `*.gradle.kts` files for my [app](http://github.com/msfjarvis/viscerion/tree/1ea6f07f8219aa42139977f37ebbcb230d7f78e7 "app") takes upto 10 seconds longer than the Groovy DSL. Couple that with the fact that changing any file from `buildSrc` invalidated the entire compiler cache for me made iterative development extremely painful.

### Half-baked API surface

Gradle doesn't seem to have invested any actual time in converting the original Groovy APIs into Kotlin-friendly versions before they peddled the Kotlin DSL to us. Check the samples below and decide for yourself.

Groovy

```groovy
android {
  compileSdkVersion 29
  buildToolsVersion = '29.0.2'
  defaultConfig {
    minSdkVersion 21
    targetSdkVersion 29
  }
  buildTypes {
    minifyEnabled = true
  }
}

dependencies {
  implementation('my.company:fancy.library:1.1.1') {
    force = true
  }
}
```

Kotlin

```groovy
android {
  compileSdkVersion(29)
  buildToolsVersion = "29.0.2"
  defaultConfig {
    minSdkVersion(21)
    targetSdkVersion(29)
  }
  buildTypes {
    isMinifyEnabled = true
  }
}

dependencies {
  implementation('my.company:fancy.library:1.1.1') {
    isForce = true
  }
}
```

I am definitely biased here, but this is not how an idiomatic Kotlin API looks like.

What we should have gotten

```groovy
android {
  compileSdkVersion = 29
  buildToolsVersion = "29.0.2"
  defaultConfig {
    minSdkVersion = 21
    targetSdkVersion = 29
  }

  buildTypes {
    minifyEnabled = true
   }
}

dependencies {
  implementation('my.company:fancy.library:1.1.1') {
    force = true
  }
}
```

Property access syntax and discoverable variable names should have been the norm since day one for it to actually be a good Kotlin DSL.

### Complexity

The Kotlin DSL is not very well documented outside Gradle's bits and pieces in documentation. Things like [this](https://github.com/msfjarvis/viscerion/commit/c851571e33189c345329ea3934ad1af15edbe6fb "this") were incredibly problematic to implement in the Kotlin DSL, at least for me and I found it to be incredibly frustrating.

## Conclusion

Again, these are my pain points with the Kotlin DSL. I still use it for some of my projects but I am not going to use it in new projects until Gradle addresses these pains.