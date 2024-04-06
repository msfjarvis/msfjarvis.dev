+++
date = 2020-07-23
summary = "Long form release notes for the Android Password Store v1.10.1 patch release"
categories = ["aps"]
slug = "aps-1.10.1-release"
title = "Android Password Store 1.10.1 patch release"
tags = ["relnotes", "oss", "android-password-store"]
socialImage = "aps_banner.webp"
+++

Hot on the heels of the [v1.10.0](https://github.com/android-password-store/Android-Password-Store/releases/tag/v1.10.0) release we have an incremental bugfix update ready to go!

As mentioned in the [previous release notes](/posts/aps-july-release), the algorithm for handling GPG keys was significantly overhauled and thus had the potential to cause some breakage. Well, it did.

This release includes 3 separate fixes for different bugs around GPG.

- [#959](https://msfjarvis.dev/aps/pr/959) ensures long key IDs are correctly parsed as hex numbers.
- [#960](https://msfjarvis.dev/aps/pr/960) fixes a type problem where we incorrectly used a `Array<Long>` that gets interpreted as a `Serializable` as opposed to the `Long[]` expected by OpenKeychain.
- [#958](https://msfjarvis.dev/aps/pr/958) reintroduces the key selection flow, adding it as a fallback for when no key has been entered into the `.gpg-id` file. This notably helps users who generate stores within the app.

The release is going up on the [Play Store](https://play.google.com/store/apps/details?id=dev.msfjarvis.aps) over the next few hours, [F-Droid](https://f-droid.org/packages/dev.msfjarvis.aps/) builds will be delayed until our patch [shifting F-Droid to the free flavor](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/7141) is not merged.
