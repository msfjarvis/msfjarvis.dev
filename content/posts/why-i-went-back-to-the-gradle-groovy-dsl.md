+++
categories = []
date = "2019-10-26T01:53:00+05:30"
draft = true
slug = "why-i-went-back-to-the-gradle-groovy-dsl"
tags = []
title = "Why I went back to the Gradle Groovy DSL"

+++
About an year ago when I first discovered the [Gradle Kotlin DSL](https://docs.gradle.org/current/userguide/kotlin_dsl.html), I was very quick to [jump](https://github.com/msfjarvis/viscerion/commit/c16d11a816c3c7e3f7bab51ef2f32569b6b657bf) [on](https://github.com/android-password-store/Android-Password-Store/commit/3c06063153d0b7f71998128dc6fb4e5967e33624) [that](https://github.com/substratum/substratum/commit/ebff9a3a88781d093565526b171d9d5b8e9c1bed) [train](https://github.com/substratum/substratum/commit/5065e082055cde19e41ee02920ca07d0e33c89f5). Now it feels like a mistake.

The initial premise of the Gradle Kotlin DSL was very cool. You get first class code completion in the IDE, and you get to write Kotlin rather than the arguably weird Groovy. 