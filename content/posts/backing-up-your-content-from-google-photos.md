+++
categories = ["how-to"]
date = 2022-04-04
description = "Putting your media into Google Photos is easy, taking it out, not as much."
draft = true
slug = "backing-up-your-content-from-google-photos"
socialImage = "/uploads/google-photos-backup.webp"
tags = ["backup", "google photos", "gphotos-cdp"]
title = "Backing up your content from Google Photos"
ShowTOC = false
+++

Google Photos has established itself as one of the most popular photo storage services, and like a typical Google service, it makes it impressively difficult to get your data back out of it :D

There are many good reasons why you'd want to archive your pictures outside of Google Photos, having an extra backup never hurts, maybe you want an offline copy for reasons, or you just want to get your stuff out so you can switch away from Google Photos entirely.

### How to archive your images from Google Photos

1. You can use [Takeout], except it **always** strips the EXIF metadata of your images, and often generates incomplete archives. Losing EXIF metadata is a deal-breaker, because you can no longer organize images automatically based on properties like date, location, and camera type.

2. You can download directly from [photos.google.com] which preserves metadata, but is embarassingly manual and basically impossible to use if you're trying archive a few years of history.

So, what's the solution?

### Enter gphotos-cdp

[gphotos-cdp] is a tool that uses the nearly-perfect method number 2 and makes it automated. It does so by using the [Chrome DevTools Protocol] to drive an instance of the Google Chrome browser, and emulates all the manual actions you'd take as a human to ensure you get copies of your pictures with all the EXIF metadata retained.

### Setting up gphotos-cdp

> Disclaimer: I've only tested this on Linux. This _should_ be doable on other platforms, but it's not relevant to my needs so I will not be investigating that.

Ideally you'd want to run this tool on a schedule on a NAS or a server to keep archiving images automatically as they get added to your Google Photos. I run this on a server provided by my friend [David] on a daily schedule.

For [gphotos-cdp] to run in a non-interactive manner, it requires your browser data directory with your Google login cookies. You can easily create this with the following command:

```bash
google-chrome \
  --user-data-dir=gphotos-cdp \
  --no-first-run  \
  --password-store=basic \
  --use-mock-keychain \
  https://photos.google.com/
```

This will launch what is essentially a fresh copy of Google Chrome with the Google Photos website on. Login to Photos and then close the browser. Optionally, re-run the command to ensure that you do not need to login again.

The flags passed to google-chrome are extracted from the default set of parameters used by [gphotos-cdp]. I wish I could explain in detail why each flag is necessary, but it's what does the trick and I got it from [this GitHub comment].

Once done, you'll have a `gphotos-cdp` directory that you need to move to the `/tmp` directory of whichever machine you wish to run [gphotos-cdp] on.

[gphotos-cdp] is written in [Go] so you'll need to install it first. Once you're done with that, run the following commands to install [gphotos-cdp]:

```bash
go install github.com/perkeep/gphotos-cdp@latest
```

Then you can go ahead and start [gphotos-cdp] with

```bash
~/go/bin/gphotos-cdp \ # go install puts things in ~/go/bin by default
  -v \ # Enable verbose logging
  -dev \ # Enable dev mode which always uses /tmp/gphotos-cdp as the profile directory
  -headless \ # Run Chrome in headless mode so it works on servers and such
  -dldir ~/photos # Download everything to ~/photos
```

### Monitoring

With anything built on such a brittle foundation, it's useful to be able to constantly monitor that things are working as they should. Through [healthchecks.io] you can easily set up alerts to notify you of failures running the tool or unintentional gaps in whatever schedule you run the tool on. I use my [healthchecks-monitor] tool paired with [crontab] to run [gphotos-cdp] every day and have configured [healthchecks.io] to notify me via Telegram when it fails. The script run by [crontab] looks like this

```bash
#!/usr/bin/env bash
HEALTHCHECKS_CHECK_ID=<UUID for check as given on healthchecks> \
HEALTHCHECKS_USERAGENT=crontab \
~/bin/healthchecks-monitor --retries 3 \ # Try running the command thrice before giving up
  --timer \ # Start off a server-side timer on healthchecks
  --logs \ # Record execution logs on healthchecks in case of failure, to help with debugging
  --exec "~/go/bin/gphotos-cdp -v -dev -headless -dldir ~/photos"
```
[takeout]: https://takeout.google.com/
[photos.google.com]: https://photos.google.com/
[gphotos-cdp]: https://github.com/perkeep/gphotos-cdp
[Chrome DevTools Protocol]: https://chromedevtools.github.io/devtools-protocol/
[david]: https://twitter.com/divadsn
[this GitHub comment]: https://github.com/perkeep/gphotos-cdp/issues/1#issuecomment-567378082
[Go]: https://go.dev
[healthchecks.io]: https://healthchecks.io
[healthchecks-monitor]: https://msfjarvis.dev/g/healthchecks-rs
[crontab]: https://man7.org/linux/man-pages/man5/crontab.5.html
