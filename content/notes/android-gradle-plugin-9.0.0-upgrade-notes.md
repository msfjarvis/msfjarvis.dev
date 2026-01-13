+++
title = "Android Gradle Plugin 9.0.0 upgrade notes"
date = "2026-01-13T06:44:00+05:30"
lastmod = "2026-01-13T06:44:00+05:30"
summary = "Some tips to ease the Android Gradle Plugin 9.0.0 upgrade"
tags = [ "android" ]
draft = false
+++
Version 9.0.0 of the Android Gradle Plugin brings in [a lot of breaking changes](https://developer.android.com/build/releases/agp-preview#android-gradle-plugin), most of which are documented with clear upgrade paths except the fact that Kotlin Multiplatform libraries now ship their Android artifacts [without consumer keep rules included](https://cs.android.com/android-studio/platform/tools/base/+/mirror-goog-studio-main:build-system/gradle-api/src/main/java/com/android/build/api/dsl/KmpOptimization.kt;l=79-87;drc=04e1247ed3cc69320f919ebb46b763e31483a7a5). This needs to be manually turned on to preserve the existing behavior:

```kotlin
android {
  consumerKeepRules {
    publish = true
    file("consumer-proguard-rules.pro")
  }
}
```
