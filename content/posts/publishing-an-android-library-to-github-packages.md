+++
categories = ["android"]
date = 2019-11-21
description = "GitHub recently rolled out Packages to the general public, allowing the entire develop-test-deploy pipeline to get centralized at GitHub. Learn how to use it to publish your Android library packages."
devLink = "https://dev.to/msfjarvis/publishing-an-android-library-to-github-packages-1l74"
slug = "publishing-an-android-library-to-github-packages"
socialImage = "uploads/github_packages_social.webp"
tags = ["android", "gradle", "github", "packaging"]
title = "Publishing an Android library to GitHub Packages"
+++

>UPDATE(06/06/2020): The Android Gradle Plugin supports the Gradle Maven Publish plugin beginning version 4.0.0, so I've added the new process for this at the beginning of this guide. The previous post follows that section.

GitHub released the Package Registry beta in May of this year, and graduated it to public availability in Universe 2019, rebranded as [GitHub Packages](https://github.com/features/packages "GitHub Packages"). It supports NodeJS, Docker, Maven, Gradle, NuGet, and RubyGems. That's a LOT of ground covered for a service that's about one year old.

Naturally, I was excited to try this out. The [documentation](https://help.github.com/en/github/managing-packages-with-github-packages/about-github-packages) is by no means lacking, but the [official instructions](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-gradle-for-use-with-github-packages) for using Packages with Gradle do not work for Android libraries. To make it compatible with Android libraries, some small but non-obvious edits are needed which I've documented here for everybody's benefit.

> GitHub Packages currently does **NOT** support unauthenticated access to packages, which means you will always require a personal access token with the `read:packages` scope to be able to download packages during build. I emailed GitHub support about this, and their reply is attached at the end of this post.

I've also created a [sample repository](https://github.com/msfjarvis/github-packages-deployment-sample/) with incremental commits corresponding to the steps given below, for people who prefer to see the code directly.

NB: Grab a Personal Access Token from GitHub with the `write:packages` scope. You will be using this as authentication to deploy packages. I'll not delve deep into this, a Google search will point you in the right direction if you're not familiar with how to obtain one.

### New deployment steps

Since the `maven-publish` plugin now works with Android libraries, all you need to do is ensure you're on Gradle 6.5 and AGP 4.0.0, then configure as follows.

```groovy
apply plugin: 'maven-publish'

afterEvaluate {
  publishing {
    repositories {
      maven {
        name = "GitHubPackages"
          url = uri("https://maven.pkg.github.com/msfjarvis/github-packages-deployment-sample")
          credentials {
            username = project.findProperty("gpr.user") ?: System.getenv("USERNAME")
            password = project.findProperty("gpr.key") ?: System.getenv("PASSWORD")
         }
      }
    }
    publications {
      release(MavenPublication) {
        from components.release
        groupId = "$GROUP"
        artifactId = "deployment-sample-library"
        version = "$VERSION"
      }
    }
  }
}
```

You still need to set some properties in `gradle.properties`

```groovy
GROUP=msfjarvis
VERSION=0.1.0-SNAPSHOT
```

And that should be it! You can check the migration commit [here](https://github.com/msfjarvis/github-packages-deployment-sample/commit/260fd3154fd393d3969afd048dc2c77d03619b1d).

### The old steps are as follows

#### Step 1

Copy the official integration step from GitHub's [guide](https://help.github.com/en/github/managing-packages-with-github-packages/configuring-gradle-for-use-with-github-packages#authenticating-with-a-personal-access-token), into your Android library's `build.gradle` / `build.gradle.kts`. If you try to run `./gradlew publish` now, you'll run into errors. We'll be fixing that shortly. \[[Commit link](https://github.com/msfjarvis/github-packages-deployment-sample/commit/d69235577a1d4345cecb364a3a3d366bf894c5a6)\]

```diff
--- library/build.gradle
+++ library/build.gradle
@@ -1,5 +1,6 @@
 apply plugin: "com.android.library"
 apply plugin: "kotlin-android"
+apply plugin: "maven-publish"
 
 apply from: "../dependencies.gradle"
 // apply from: "../bintrayconfig.gradle"
@@ -28,6 +29,24 @@ android {
   }
 }
 
+publishing {
+  repositories {
+    maven {
+      name = "GitHubPackages"
+      url = uri("https://maven.pkg.github.com/msfjarvis/github-packages-deployment-sample")
+      credentials {
+        username = project.findProperty("gpr.user") ?: System.getenv("USERNAME")
+        password = project.findProperty("gpr.key") ?: System.getenv("PASSWORD")
+      }
+    }
+  }
+  publications {
+    gpr(MavenPublication) {
+      from(components.java)
+    }
+  }
+}
+
 dependencies {
   api deps.support.app_compat
   implementation deps.kotlin.stdlib8
```

#### Step 2

Switch out the `maven-publish` plugin with [this](https://github.com/wupdigital/android-maven-publish) one. It provides us an Android component that's compatible with publications and precisely what we need. \[[Commit link](https://github.com/msfjarvis/github-packages-deployment-sample/commit/1452c4a0c15d394b73dc3384f02834788dfe1bda)\]

```diff
--- build.gradle
+++ build.gradle
@@ -14,6 +14,7 @@ buildscript {
     classpath deps.gradle_plugins.kotlin
     classpath deps.gradle_plugins.spotless
     classpath deps.gradle_plugins.versions
+    classpath deps.gradle_plugins.android_maven_publish
   }
 }
 
--- dependencies.gradle
+++ dependencies.gradle
@@ -12,7 +12,8 @@ ext.deps = [
         spotless: "com.diffplug.spotless:spotless-plugin-gradle:3.26.0",
         versions: "com.github.ben-manes:gradle-versions-plugin:0.27.0",
         bintray_release: "com.novoda:bintray-release:0.9.1",
-        kotlin: "org.jetbrains.kotlin:kotlin-gradle-plugin:1.3.60"
+        kotlin: "org.jetbrains.kotlin:kotlin-gradle-plugin:1.3.60",
+        android_maven_publish: "digital.wup:android-maven-publish:3.6.2"
     ],
 
     kotlin: [

--- library/build.gradle
+++ library/build.gradle
@@ -1,6 +1,6 @@
 apply plugin: "com.android.library"
 apply plugin: "kotlin-android"
-apply plugin: "maven-publish"
+apply plugin: "digital.wup.android-maven-publish"
 
 apply from: "../dependencies.gradle"
 // apply from: "../bintrayconfig.gradle"
```

#### Step 3

Switch to using the `android` component provided by `wup.digital.android-maven-publish`. This is the one we require to be able to upload an [AAR](https://developer.android.com/studio/projects/android-library) artifact. \[[Commit link](https://github.com/msfjarvis/github-packages-deployment-sample/commit/7cc6fcd6ffa5774433bce76ac6929435dbbb77cc)\]

```diff
--- library/build.gradle
+++ library/build.gradle
@@ -42,7 +42,7 @@ publishing {
   }
   publications {
     gpr(MavenPublication) {
-      from(components.java)
+      from(components.android)
     }
   }
 }
```

#### Step 4

Every Gradle/Maven dependency's address has three attributes, a group ID, an artifact ID, and a version.

```groovy
implementation 'com.example:my-fancy-library:1.0.0'
```

Here:

* Group ID: `com.example`
* Artifact ID: `my-fancy-library`
* Version: `1.0.0`

We'll need to configure these too. I prefer using the `gradle.properties` file for this purpose since it's very easy to access variables from it, but if you have a favorite way of configuring build properties, use that instead! \[[Commit link](https://github.com/msfjarvis/github-packages-deployment-sample/commit/cee74a5e0b3b76d1d7a2d4eb9636d80fb1db49d6)\]

```diff
--- gradle.properties
+++ gradle.properties
@@ -19,3 +19,7 @@ android.useAndroidX=true
 android.enableJetifier=true
 # Kotlin code style for this project: "official" or "obsolete":
 kotlin.code.style=official
+
+# Publishing config
+GROUP=msfjarvis
+VERSION=0.1.0-SNAPSHOT

--- library/build.gradle
+++ library/build.gradle
@@ -43,6 +43,10 @@ publishing {
   publications {
     gpr(MavenPublication) {
       from(components.android)
+      groupId "$GROUP"
+      artifactId "deployment-sample-library"
+      // Use your configured version outside CI, the SHA of the top commit inside.
+      version System.env['GITHUB_SHA'] == null ? "$VERSION" : System.env['GITHUB_SHA']
     }
   }
 }
```

#### Step 5

Now all that's left to do is configure GitHub Actions. Go to the Secrets menu in your repository's settings, then create a `PACKAGES_TOKEN` secret and provide the access token you generated earlier. Head over to the [documentation](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) for Secrets if you wanna know how this works under the hood.

Now, let's add the actual configuration that'll get Actions up and running.

```diff
--- /dev/null
+++ .github/workflows/publish_snapshot.yml
@@ -0,0 +1,13 @@
+name: "Release per-commit snapshots"
+on: push
+
+jobs:
+  setup-android:
+    runs-on: ubuntu-latest
+    steps:
+    - uses: actions/checkout@master
+    - name: Publish snapshot
+      run: ./gradlew publish
+      env:
+        USERNAME: msfjarvis
+        PASSWORD: ${{ secrets.PACKAGES_TOKEN }}
```

That's it! Once you push to GitHub, you'll see the [action running](https://github.com/msfjarvis/github-packages-deployment-sample/commit/42e1f6609bf9f2abe8e181296a57d86df648b4d4/checks?check_suite_id=322323808) in your repository's Actions tab and a [corresponding package](https://github.com/msfjarvis/github-packages-deployment-sample/packages/60429) in the Packages tab once the workflow finishes executing.

### Closing notes

The requirement to authenticate for packages is a significant problem with GitHub Packages' adoption, giving an edge to solutions like [JitPack](https://jitpack.io) which handle the entire process automagically. As mentioned earlier, I did contact GitHub support about it and got this back.

![GitHub support reply about authentication requirement for packages](/uploads/github_packages_support_response.webp)

My interpretation of this is quite simply that **it's gonna take a while**. I hope not :)