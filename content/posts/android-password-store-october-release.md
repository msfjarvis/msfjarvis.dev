+++
categories = ["aps"]
date = 2020-10-22
description = "Long form release notes for the  Android Password Store  October release"
slug = "aps-october-release"
socialImage = "uploads/aps_banner.webp"
tags = ["relnotes", "oss", "android-password-store"]
title = "Android Password Store October release"
toc = true
+++

We're back with yet another release! As I tweeted [earlier this month](https://twitter.com/msfjarvis/status/1314943278173745152), this is going to our last release for a while. There's a lot of work left to be done, and we're simply not big enough a team to have these larger changes be done separately from our main development. We'll still be doing bugfix releases if and when required, so please do file bug reports as and when you encounter issues.

## New features

### GPG key selection added to onboarding

Creating a new store from the app previously created an unusable store, because we never configured a GPG key in the `.gpg-id` file. This has now been remedied in two ways: empty `.gpg-id` files are correctly handled as invalid and included in our quickfix solution, and creating a new store will now request you to select a key and then write it into the `.gpg-id` file. Here's what the key selection screen looks like:

![GPG key selection screen from the APS October release](/uploads/aps-october-release-gpg-key-selection.webp)

### Allow configuring an HTTPS proxy

Before we close the gates on our regularly scheduled releases, our focus has been to address most longstanding issues and one of the major ones there has been [Proxy support](https://github.com/android-password-store/Android-Password-Store/issues/163). This has now been added, and can be accessed from the settings screen. Unfortunately, there are still a few caveats with this current implementation that may or may not change in a future patch release:

- No SOCKS5 support
- Relatively unhelpful error messages when proxy connection fails

### Add option to automatically sync repository

~~This too, has been a [consistent request](https://github.com/android-password-store/Android-Password-Store/issues/277) in the past. While our implementation does not exactly match what was requested, we feel it's good enough to be shipped. You now have the option to sync your repository on every launch to ensure things are always up-to-date when you get in the app.~~

Due to multiple bugs, this feature has been rolled back in [v1.13.1](https://github.com/android-password-store/Android-Password-Store/releases/tag/v1.13.1).

<!--![App launch screen showing the repository being synced](/uploads/aps-october-release-syncing-repository.webp)-->

## Fixes

### Improved error messaging

For a large set of connection related errors, the failure message would simply be 'Invalid remote: origin'. That is exactly as unhelpful as one might think, and now we try harder to extract the actual, more meaningful error message.

### Use Git's default user and email when none are configured

We don't force users to set a name and email before they make any changes requiring Git commits, but somewhere in the last couple releases we regressed our behavior around this. Rather than the `root <root@localhost>` committer, we were incorrectly using empty strings resulting in all commits being authored by ` <>`. This has now been resolved, and your commit history will now be adorned by `root@localhost` once more (but seriously, just set your name and email already).

### Improvements around phishing detection UX

APS has had comprehensive phishing detection built into our Autofill since day one. Our phishing-resistant search will not show your `google.com` passwords when you try to fill into `goggle.com`, and if the signature of an application changes after you first filled a password into it, we will warn you about the change. There were a couple issues with the way this was happening.

First, the phishing detection UI was a bit complicated, and also had some unreadable, black-on-dark text. Since this was never reported to us, I believe none of our users are being phished by their apps which is great news :) Regardless, it is now fixed.

Secondly, some complexity with how Android's Autofill APIs work resulted in the "no I'm not being phished, accept this new signature" case to not work correctly. This caused the user to be continually shown the phishing detection prompt until they force closed the target app and started it again. That's cumbersome, so we've fixed it now. Cheers to Fabian for his stellar work as always!

### Conclusion

As you can notice, this is a bit of a small release by our standards. Fabian's been busy with his Ph.D. (!!) and the new job he's starting at soon (!!), and me and Aditya have been busy with our day jobs as well. This doesn't spell doom for the project (yet), but your financial contributions over on [GitHub Sponsors](https://github.com/sponsors/msfjarvis) and [OpenCollective](https://opencollective.com/Android-Password-Store) are now much more important than ever to sustain the project during this time via bountied issues and simply compensating the current crop of developers for their time.
