+++
categories = ["how-to"]
date = "2022-04-04T12:00:00+05:30"
lastmod = "2022-04-04T12:00:00+05:30"
slug = "backing-up-your-content-from-google-photos"
summary = "Putting your media into Google Photos is easy, taking it out, not as much."
tags = ["backup", "google photos", "gphotos-cdp"]
title = "Backing up your content from Google Photos"
+++

Google Photos has established itself as one of the most popular photo storage services, and like a typical Google service, it makes it impressively difficult to get your data back out of it :D

There are many good reasons why you'd want to archive your pictures outside of Google Photos, having an extra backup never hurts, maybe you want an offline copy for reasons, or you just want to get your stuff out so you can switch away from Google Photos entirely.

### How to archive your images from Google Photos

1. You can use [Takeout], except it **always** strips the EXIF metadata of your images, and often generates incomplete archives. Losing EXIF metadata is a deal-breaker, because you can no longer organize images automatically based on properties like date, location, and camera type.

2. You can download directly from [photos.google.com] which preserves metadata, but is embarassingly manual and basically impossible to use if you're trying archive a few years of history.

So, what's the solution?

### gphotos-cdp

[gphotos-cdp] is a tool that uses the nearly-perfect method number 2 and makes it automated. It does so by using the [Chrome DevTools Protocol] to drive an instance of the Google Chrome browser, and emulates all the manual actions you'd take as a human to ensure you get copies of your pictures with all the EXIF metadata retained.

### Setting up gphotos-cdp

> Disclaimer: I've only tested this on Linux. This _should_ be doable on other platforms, but it's not relevant to my needs so I will not be investigating that.

Ideally you'd want to run this tool on a schedule on a NAS or a server to keep archiving images automatically as they get added to your Google Photos. I personally run this inside a hosted VM on a daily schedule.

For gphotos-cdp to run in a non-interactive manner, it requires your browser data directory with your Google login cookies. You can easily create this with the following command:

```bash
google-chrome \
  --user-data-dir=gphotos-cdp \
  --no-first-run  \
  --password-store=basic \
  --use-mock-keychain \
  https://photos.google.com/
```

This will launch Google Chrome with a brand new profile. Login to Photos, and then close the browser. Optionally, re-run the command to ensure that you do not need to login again.

> The flags passed to google-chrome are extracted from the default set of parameters used by gphotos-cdp. I wish I could explain why each flag is necessary, but all I know is that it does the trick. I got them from [this GitHub comment] on the issue tracker for gphotos-cdp.

Once done, you'll have a `gphotos-cdp` directory that you'll need to move to the `/tmp` directory of whichever machine you wish to run gphotos-cdp on.

gphotos-cdp is written in [Golang] so you'll need to install it first. Once done, run the following command to install the latest version of gphotos-cdp

```bash
go install github.com/perkeep/gphotos-cdp@latest
```

Then you can go ahead and start using gphotos-cdp, as given below

```bash
~/go/bin/gphotos-cdp \ # go install puts things in ~/go/bin by default
  -v \ # Enable verbose logging
  -dev \ # Enable dev mode which always uses /tmp/gphotos-cdp as the profile directory
  -headless \ # Run Chrome in headless mode so it works on servers and such
  -dldir ~/photos # Download everything to ~/photos
```

The automation techniques used are not completely reliable and can often fail. You'll want to implement some kind of retry-on-failure logic to ensure this is run a few times every day.

### Monitoring

With anything built on such a brittle foundation, it's useful to be able to constantly monitor that things are working as they should.

Using [healthchecks.io] you can easily set up alerts that notify you of failures running the tool or unintentional gaps in the schedule you run the gphotos-cdp on. I use my [healthchecks-monitor] CLI in a [cron] job to run gphotos-cdp every day, and healthchecks.io notifies me via Telegram when it fails. The script running in cron looks like this

```bash
#!/usr/bin/env bash

HEALTHCHECKS_CHECK_ID=<UUID for check as given on healthchecks> \
HEALTHCHECKS_USERAGENT=crontab \
~/bin/healthchecks-monitor --retries 3 \ # Try running the command thrice before giving up
  --timer \ # Start off a server-side timer on healthchecks
  --logs \ # Record execution logs on healthchecks in case of failure, to help with debugging
  --exec "~/go/bin/gphotos-cdp -v -dev -headless -dldir ~/photos"
```

### Conclusion

As evident, it's not an easy task to automatically archive your pictures from Google Photos. The setup is tedious and prone to breakage when any authentication related change happens, such as you accidentally logging out the "device" being used by gphotos-cdp or changing your password, in which case you will need to create the `gphotos-cdp` directory with Chrome again.

Also, the technique in this post could easily stop working at any time if Google chooses to break it. That being said, gphotos-cdp was last updated in 2020 and still continues to function as-is so there is some degree of hope that it can be used for quite a bit more.

Hopefully this setup causes you minimal grief and allows you to back up your precious memories without relying only on Google :)

[takeout]: https://takeout.google.com/
[photos.google.com]: https://photos.google.com/
[gphotos-cdp]: https://github.com/perkeep/gphotos-cdp
[chrome devtools protocol]: https://chromedevtools.github.io/devtools-protocol/
[this github comment]: https://github.com/perkeep/gphotos-cdp/issues/1#issuecomment-567378082
[golang]: https://go.dev
[healthchecks.io]: https://healthchecks.io
[healthchecks-monitor]: https://msfjarvis.dev/g/healthchecks-rs
[cron]: https://man7.org/linux/man-pages/man5/crontab.5.html
