+++
categories = ["android"]
date = 2019-11-21T06:27:52Z
draft = true
slug = "publishing-an-android-library-to-github-packages"
tags = ["android", "gradle", "github", "packaging"]
title = "Publishing an Android library to GitHub packages"

+++
GitHub released the Package Registry beta in GitHub Universe 201818, and graduated it out of beta in Universe 2019, rebranded as [GitHub Packages](https://github.com/features/packages "GitHub Packages") and now generally available. It supports Node, Docker, Maven, Gradle, NuGet, and RubyGems. That's a LOT of ground covered for a service that's about one year old.

Naturally, I was excited to try this out. The [documentation](https://help.github.com/en/github/managing-packages-with-github-packages/about-github-packages) is by no means lacking, but the [official instructions](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-gradle-for-use-with-github-packages) for using Packages with Gradle does not work for Android libraries. After spending entirely too much time mucking around and discovering that I had previously revoked the access token I was trying to use I managed to wire up Packages with my FAB library which you can find [here](https://github.com/msfjarvis/floating-action-button). Here's how I setup continuous deployments of my library to GitHub Packages, powered by GitHub Actions.

* Grab a Personal Access Token from GitHub with the `write:packages` scope which you will be using as authentication to deploy packages. I'll not delve deep into this, a Google search will point you in the right direction if you're not familiar with how to obtain one.
* Copy the official integration step from GitHub's [guide](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-gradle-for-use-with-github-packages#authenticating-with-a-personal-access-token), into your Android library's `build.gradle`/`build.gradle.kts`. If you try to run `./gradlew publish` now, you'll run into errors. We'll be fixing that shortly.
* Switch out the `maven-publish` plugin with [this](https://github.com/wupdigital/android-maven-publish) one. It provides us an Android component that's compatible with publications and precisely what we need.
* Replace 