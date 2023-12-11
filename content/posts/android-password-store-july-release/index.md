+++
categories = ["aps"]
date = 2020-07-22
summary = "Long form release notes for the Android Password Store July release"
slug = "aps-july-release"
socialImage = "uploads/aps_banner.webp"
tags = ["relnotes", "oss", "android-password-store"]
title = "Android Password Store July release"
toc = true
+++

As promised, here are detailed release notes for the [v1.10.0](https://github.com/android-password-store/Android-Password-Store/releases/tag/v1.10.0) build of Android Password Store that is going out right now on the Play Store and to F-Droid in the coming days. This is a massive one even compared to our previous v1.9.0 major release, which was our largest release when it went out. Let's dive into the changes!

## New features

### TOTP support

I [removed support for HOTP and TOTP secrets](https://msfjarvis.dev/aps/pr/806) back in v1.9.0 due to multiple reasons, a) it was blocking important refactoring efforts, b) it had zero test coverage, and c) none of the maintainers used it. Play Store reviews swiftly reminded us that people did use the feature even in its wonky state, and demanded its return. I stuck to our decision as maintainers for a while, but active members of the pass community like [erayd](https://github.com/erayd) (who happens to be the maintainer for [browserpass](https://github.com/browserpass)!) were able to convince us otherwise and provided good, actionable feedback allowing us to [bring back TOTP](https://msfjarvis.dev/aps/pr/890) support into APS, better than ever before.

The new implementation is backed by a solid suite of tests and contains new features like the ability to import TOTP URIs using QR codes, being able to Autofill them into webpages as well as extracting OTPs from SMSes (not available on F-Droid due to GMS dependencies for SMS monitoring).

### Support for ED25519/ECDSA keys

With our ongoing efforts to switch over from the dated [Jsch](http://www.jcraft.com/jsch/) SSH library to the more up-to-date and maintained [SSHJ](https://github.com/hierynomus/sshj), we now fully support ED25519 and ECDSA keys! You no longer need to rely on RSA to authenticate from your phone to your Git host :)

In a future release, we'll be bringing more improvements to this area including generating and storing SSH keys in the [Android Keystore](https://source.android.com/security/keystore/) for enhanced security as well as support for fallback authentication.

### Proper support for per-directory keys

[pass](https://www.passwordstore.org/) has a neat feature where it allows you to use a separate GPG key for a subdirectory, such as for sharing passwords across a team. It achieves this by looking for a `.gpg-id` file starting from the current directory, up to the root of the store. The first file it finds is what it uses as the key for the GPG operations.

```shell
$ tree -a store
store
├── .gpg-id <-- contains the key ABCDE01234
└── subdirectory1
    └── .gpg-id <-- contains the key FGHIJ56789
```

In this directory structure, `pass generate subdirectory1/example.com` will use the `FGHIJ56789` key, and `pass generate example.com` will use `ABCDE12345`.

Previously, Password Store would only correctly handle decryption in this situation, and fail to select the right key for encrypting. The workaround for this was to manually select the key from settings that you wished to use, before creating a password. That's pretty stupid, and we're sorry you had to do that earlier. Now, Password Store uses an algorithm similar to the `pass` CLI to find the correct `.gpg-id` file and read the key from it. GnuPG is more 'forgiving', if you will, in what type of key values it can work with so there's a slim chance that your current workflow might now be broken. If this happens, please immediately either file an issue over on the [GitHub repository](https://msfjarvis.dev/aps) or email us at [aps@msfjarvis.dev](mailto:aps@msfjarvis.dev) with as much detail as you can and we'll resolve it ASAP.

## Bugfixes

### Better protection against invalid filename changes

Over the past few releases we've been hard at work improving the password edit flow, making it more accessible and 'obvious' to users and simultaneously prevent any hidden footguns from souring the experience. We received a bug report about [file renaming](https://msfjarvis.dev/aps/issue/928) having unexpected behavior that caused destructive actions in the store, and in response we [now have better safeguards against this](https://msfjarvis.dev/aps/pr/929) and have improved the UI to make things more clear to users.

### Export passwords asynchronously

Previously the password export would run on the main thread and potentially cause the app to completely freeze and throw a 'Password Store is not responding error'. This has been rectified, and the export now occurs in an entirely separate process.

### UI fixes

A bunch of UI feedback was provided to us after the last major release and we've worked to address it in this one. Long file/folder names now correctly wrap across lines, and the error UI for wrong password/passphrase is now aesthetically correct [[PR](https://msfjarvis.dev/aps/pr/892)].

### QoL improvements

We've been aggressively refactoring the codebase to use modern APIs like [ActivityResultContracts](https://msfjarvis.dev/aps/pr/910) and making large scale architectural changes to our old code in efforts to improve maintainability in the future. We also have work-in-progress rewrites of the [Git commands pipeline](https://msfjarvis.dev/aps/pr/865) and incoming support for [fallback authentication](https://msfjarvis.dev/aps/pr/825).

## General changes and improvements

### New icon and color scheme

Right off the bat, you will notice a brand new icon for Password Store. This was created for us by [Radek Błędowski](https://twitter.com/RKBDI), go check him out!

![New icon](/uploads/aps_banner.webp)

To complement the new icon, we've also updated our color scheme to better suit this new branding.

### Simplified XkPasswd implementation

While revisiting our UI during the icon change, we realised that the alternate XkPasswd password generator option we introduced back in v1.6.0 was a tad too complicated to use with a lot more knobs and switches than necessary. This has been fixed, and we hope that it's now at a level of accessibility that allows more users to try it out.

### Improvements to biometric lock transition and password list UI

The biometric authentication UI flow has been updated to show the authentication dialog over a transparent screen, before starting the app upon success. We've also retouched the password list to remove the leading icons, as we have been consistently receiving numerous comments about them being unnecessary and a bit ugly. In v1.4.0 we introduced child counts and iconographic hints to directories, and we feel they are more than sufficient to communicate the difference between them and password files. We welcome all feedback about these changes at [me@msfjarvis.dev](mailto:me@msfjarvis.dev).

## In conclusion

There are a lot more changes in this release than those included in this post, which you can check out [here](https://github.com/android-password-store/Android-Password-Store/milestone/10). We're constantly at work improving APS and all constructive feedback helps us create a better experience for users and ourselves, so please keep it coming (over email, if it's a suggestion. Play Store reviews are not good for back-and-forth communication).

Lastly, Android Password Store development thrives on your donations. You can sponsor the project on [Open Collective](https://opencollective.com/Android-Password-Store), or me directly through GitHub Sponsors by clicking [here](https://github.com/sponsors/msfjarvis?o=esc). GitHub Sponsors on Tier 2 and above get expedited triage times and priority on issues :)

See you next month!
