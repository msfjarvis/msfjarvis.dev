+++
categories = ["aps"]
date = "2020-07-30T12:00:00+05:30"
lastmod = "2020-07-30T12:00:00+05:30"
slug = "aps-1.10.2-release"
summary = "Long form release notes for the Android Password Store v1.10.2 patch release"
tags = ["relnotes", "oss", "android-password-store"]
title = "Android Password Store 1.10.2 patch release"
+++

Exactly one week after the [previous patch release](/posts/aps-1.10.1-release), we have another small release fixing a few bugs that were deemed too high-priority for our usual release cadence.

List of the patches included in this release:

- [#985](https://github.com/android-password-store/Android-Password-Store/pull/985) fixes a couple of crashes originating in the new SMS OTP autofill feature that completely broke it.
- [#982](https://github.com/android-password-store/Android-Password-Store/pull/982) ensures that the 'Add TOTP' button only shows when its needed to.
- [#969](https://github.com/android-password-store/Android-Password-Store/pull/969) improves support for pass entries that only contain TOTP URIs, and no password.

This release has been uploaded to the Play Store and should reach users in a few hours. F-Droid is [yet to merge](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/7141) our MR to support the free flavor we've created for them so just like the previous two release in the 1.10.x generation, this too shall not be available on their store just yet.
