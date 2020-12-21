+++
categories = ["github-actions"]
date = 2020-12-11T00:00:00Z
description = "GitHub Actions is a power CI/CD platform that can do a lot more than your traditional CI systems. Here's some tips to get you started with exploring its true potential."
draft = true
slug = "github-actions-tips-tricks"
socialImage = "/uploads/actions_social.webp"
tags = ["tips and tricks", "github actions"]
title = "Tips and Tricks for GitHub Actions"

+++

GitHub Actions has grown at a rapid pace, and has become the CI platform of choice for most open source projects. The recent changes to Travis CI's pricing for open source is certainly bound to accelerate this even more.

Due to it being a first-party addition to GitHub, Actions has nearly infinite potential to run jobs in reaction to changes on GitHub. You can automatically set labels to newly opened pull requests, greet first time contributors, and more.

Let's go over some things that you can do with Actions, and we'll end it with some safety related tips to ensure that your workflows are secure from both rogue action authors as well as rogue pull requests.

## Running a cron job

For [Android Password Store](https://msfjarvis.dev/aps), we maintain a list of known [publicsuffixes](https://publicsuffix.org/) to be able to do efficient detection of the 'base' domain of a website we're autofilling into. This list changes infrequently, and we sync it each week into our own repository. Actions enables us to do this automatically, like this.

```yaml
name: Update Publix Suffix List data
on:
  schedule:
    - cron: '0 0 * * 6'

jobs:
  update-publicsuffix-data:
  # The details of how this workflow actually operates are not important here
```

The `on.schedule.cron` trigger here is doing the main job here of accepting a cron expression ([crontab.guru](https://crontab.guru/) let's you write your own with ease), which defines how often this workflow executes. In [my case](https://crontab.guru/#0_*_*_*_6), you can see that it should execute at 12AM on every Saturday. Going through the merged pull requests in APS, you will notice that the [publicsuffixlist pull requests](https://github.com/android-password-store/Android-Password-Store/pulls?q=is%3Apr+is%3Amerged+sort%3Aupdated-desc+label%3APSL) indeed happen at intervals of at least 7 days.

This obviously is a very naive example of how you can use cron triggers to automate parts of your workflow. The [Rust](https://github.com/rust-lang) project maintains a repository called [glacier](https://github.com/rust-lang/glacier) which maintains a list of internal compiler errors (ICEs) with code fragments to reproduce them and using a similar cron trigger, checks each new nightly release of Rust to see if any of them were resolved silently by a refactor. When it comes across a ICE that was fixed (compiles correctly or fails with errors), it files a [pull request](https://github.com/rust-lang/glacier/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+sort%3Aupdated-desc) moving the reproduction file to the `fixed` pile. It's a *very* smart use of the cron feature!
