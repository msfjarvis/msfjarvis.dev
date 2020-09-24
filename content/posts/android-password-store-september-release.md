+++
categories = ["aps"]
date = 2020-09-21
description = "Long form release notes for the Android Password Store September release"
slug = "aps-september-release"
socialImage = "uploads/aps_banner.webp"
tags = ["relnotes", "oss", "android-password-store"]
title = "Android Password Store September release"
toc = true
+++

Continuing with this new-ish tradition we have going here, here are the detailed release notes for the [v1.12.0](https://github.com/Android-Password-Store/android-password-store/releases/tag/v1.12.0) release.

> Multiple important announcements at the end of the page, make sure to read the whole thing!

## New features

### Extend Autofill support to more browsers

[Devin J. Pohly](https://github.com/djpohly) and [Rounak Dutta](https://github.com/rounakdatta) collectively contributed support for 3 new Chromium-based browsers: [Bromite](https://www.bromite.org/), [Ungoogled Chromium](https://git.droidware.info/wchen342/ungoogled-chromium-android) and [Kiwi](https://kiwibrowser.com/).

### Allow sorting by recently used

This feature was requested [a while ago](https://msfjarvis.dev/aps/issue/535) and was [implemented by Alex Molinares](https://msfjarvis.dev/aps/pr/1031) early in the cycle. The database that keeps track of the recently used passwords is always active, so if and when you switch to this sorting mode you'll see everything already sorted based on your old usage patterns. Neat!

### Add ability to view Git commit log

Another, [even older](https://msfjarvis.dev/aps/issue/284) feature request has finally been addressed. This too, [came from an external contributor](https://msfjarvis.dev/aps/pr/1056) and was one of the best pull requests I have ever seen. It's a great feature, and I thoroughly enjoyed the entire process of its inclusion.

### SSH key generation and handling improvements

The old SSH key generation has been [scrapped and rewritten](https://msfjarvis.dev/aps/pr/1070) to use a set of safer cryptographic curve options that span the distance between widely supported and very secure. The [wiki page](https://github.com/android-password-store/Android-Password-Store/wiki/Generate-SSH-Key) has been updated for these changes with information on how we're securing access to the actual SSH keys, like storing the key file in the Android Keystore and requiring screen lock authentication before the key can be used.

### Fallback authentication for SSH

SSH servers are often configured to have multiple authentication methods, where you first attempt to authenticate with private keys and if that fails, fall back to passwords. This wasn't previously supported in APS, which would quit after the first failure. We've changed that to now offer the option of entering a password if the server is configured to fall back to it.

### Rewritten and redesigned onboarding flow

In a multi-step refactoring process, the initial flow of setting up the app has been completely revamped. The internals were completely overhauled to improve stability, weed out some gnarly hacks, and make the whole thing easier to test and understand. Maintainer [Aditya Wasan](https://github.com/Skrilltrax) did a fabulous job giving the [UI a facelift](https://msfjarvis.dev/aps/pr/1099). It's real pretty now ✨

### Show hidden folders now also shows hidden directories

Our old 'Show hidden folders' feature has now been simplified to show _all_ hidden files and folders in the repository. It is intended to make it easier to perform trivial maintenance tasks that would normally require access to a PC.

## Bugfixes

### SSH connection problems with Bitbucket

In our last major release, we included a change to [re-use SSH connections](https://msfjarvis.dev/aps/pr/1012) to speed up Git operations. This had an unfortunate side effect: Bitbucket users were unable to use SSH to connect to their repositories. Atlassian has been [aware of this problem](https://community.atlassian.com/t5/Bitbucket-questions/Can-t-repo-sync-anymore/qaq-p/354231) for quite some time now and did nothing about it, so we now include a [helpful message and an internal workaround](https://msfjarvis.dev/aps/pr/1093) when this particular type of error is encountered.

### Symlink support

While still potentially finicky, we're now confident that this is ready to be shipped to all users without the risk of crashes.

### Assorted UX improvements

As always, there are a handful of Quality of Life changes to make the app more enjoyable to use:

-   When retrying password authentication, the option to see what you're typing would be obscured by the error icon for wrong password. This has been remedied, and the error state will now be cleared as soon as you enter anything into the password field.
-   Authentication modes will now be dynamically hidden and shown based on the URL's schema so you're aware of what methods you have for authentication for any given remote repository.
-   Since decryption can sometimes take a couple seconds due to how OpenKeychain works, we now hide the action buttons at the top of the screen until the decrypt operation has completed since using the buttons before that can leave the app in an odd state.
-   Users will be prompted if they need to provide a username in their URLs. For example, if your repository is at `https://github.com/john.doe/passwords`, you will have to change the URL to `https://john.doe@github.com/john.doe/passwords` for HTTPS authentication to work.
-   If it appears that an SSH URL contains a custom port but does not specify the `ssh://` schema, the user will be prompted to accept a quickfix that does it for them.
-   Pressing the save button is no longer necessary to save changes to authentication mode.
-   TOTP values might sometimes be outdated because we always wait 30 seconds to generate a new one. Now the app will calculate the time left before the first generated value goes stale, generate a new one once it does, and then resume the 30 second cycle.

There's definitely more fixes here, but we ended up rewriting, breaking and fixing so many things for this release that it's hard to tell what was actually broken in the previous release and what is just us fixing regressions during refactoring. We've been busy :)

## Important announcements

### Autofill parser is now a standalone library!

Our excellent Autofill capabilities are now bundled as a separate Android library and can be used by other password managers to improve their Autofill experiences. Detailed documentation will be coming over the next few days, keep an eye out [here](https://github.com/android-password-store/Android-Password-Store/tree/develop/autofill-parser) if it's something you're interested in.

### RFC for removal of Git support in external repos

Based on the issues raised in the repository and the support emails I've received, the maintainers have come to the conclusion that nearly all users who choose to store their pass repositories in their device storage or external SD card as opposed to the app's private, hidden directory are not users of Git and rely on solutions like Syncthing and Nextcloud to keep the repository in sync with their other devices.

As such, we are now in the process of removing Git support from these repositories. We've carefully evaluated how we want to do this, and have started with removing the ability to clone repositories to public storage in this release. If this doesn't blow up in our faces, we will be completing the transition in v1.13.0. If you believe the change adversely affects your usage of the app, we wanna know! Drop a comment on [GitHub](https://msfjarvis.dev/aps/issue/1118) and we will do our best to either propose an alternative for your use case or entirely scrap our plans if we discover that our initial inferences were misguided.

