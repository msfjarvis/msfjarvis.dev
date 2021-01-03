+++
categories = ["github-actions"]
date = 2021-01-02T00:00:00Z
description = "GitHub Actions is a power CI/CD platform that can do a lot more than your traditional CI systems. Here's some tips to get you started with exploring its true potential."
draft = true
slug = "github-actions-tips-tricks"
socialImage = "/uploads/actions_social.webp"
tags = ["tips and tricks", "github actions", "schedules", "jobs", "workflows"]
title = "Tips and Tricks for GitHub Actions"
+++

> // TODO: add more links across the entire post.

GitHub Actions has grown at a rapid pace, and has become the CI platform of choice for most open source projects. The recent changes to Travis CI's pricing for open source is certainly bound to accelerate this even more.

Due to it being a first-party addition to GitHub, Actions has nearly infinite potential to run jobs in reaction to changes on GitHub. You can automatically set labels to newly opened pull requests, greet first time contributors, and more.

Let's go over some things that you can do with Actions, and we'll end it with some safety related tips to ensure that your workflows are secure from both rogue action authors as well as rogue pull requests.

## Running workflows based on a cron trigger

For [Android Password Store](https://msfjarvis.dev/aps), we maintain a list of known [publicsuffixes](https://publicsuffix.org/) to be able to do efficient detection of the 'base' domain of a website we're autofilling into. This list changes frequently, and we typically sync our repository with the latest copy on a weekly basis. Actions enables us to do this automatically, like this:

```yaml
name: Update Publix Suffix List data
on:
  schedule:
    - cron: '0 0 * * 6'

jobs:
  update-publicsuffix-data:
  # The actual workflow doing the update job
```

The `on.schedule.cron` trigger here is doing the main job here of accepting a cron expression ([crontab.guru](https://crontab.guru/) let's you write your own with ease), which defines how often this workflow executes. In [my case](https://crontab.guru/#0_*_*_*_6), you can see that it executes at 12AM on every Saturday. Going through the merged pull requests in APS, you will notice that the [publicsuffixlist pull requests](https://github.com/android-password-store/Android-Password-Store/pulls?q=is%3Apr+is%3Amerged+sort%3Aupdated-desc+label%3APSL) indeed happen at intervals of at least 7 days.

Mine is a very naive example of how you can use cron triggers to automate parts of your workflow. The [Rust](https://github.com/rust-lang) project uses these same triggers to implement a significantly important aspect of their daily workings. Rust maintains a repository called [glacier](https://github.com/rust-lang/glacier) which contains a list of internal compiler errors (ICEs) and code fragments to reproduce each of them. Using a similar cron trigger, this repository checks each new nightly release of Rust to see if any of these compiler crashes were resolved silently by a refactor. When it comes across a ICE that was fixed (compiles correctly or fails with errors rather than crashing), it files a [pull request](https://github.com/rust-lang/glacier/pulls?q=is%3Apr+author%3Aapp%2Fgithub-actions+sort%3Aupdated-desc) moving the reproduction file to the `fixed` pile. It's a *very* smart and effective use of the cron feature!

## Running jobs based on commit message

Continuous delivery is great, but sometimes you want slightly more control. Rather than run a deployment task on each push to your repository, what if you want it to only run when a specific keyword is in the commit message? Actions has support for this natively, and the deployment pipeline of this very site relies on this feature.

```yaml
name: Deploy to Cloudflare Workers Sites

on:
  push:
    branches:
      - main

jobs:
  deploy-main:
    if: "contains(github.event.head_commit.message, '[deploy]')"
    # Set up wrangler and push to the production environment

  deploy-staging:
    if: "contains(github.event.head_commit.message, '[staging]')"
    # Set up wrangler and push to the staging environment
```

This snippet defines a job that is only executed when the top commit of the push contains the text `[deploy]` in its message, and another that only runs when the commit message contains `[staging]`. Together, these let me control if I want a change to not be immediately deployed, deployed to either the main or staging site, or to both at the same time. So now I can update a draft post without a full re-deployment of the main site, or make a quick edit to a published post that doesn't need to be reflected in the staging environment.

## Testing across multiple configurations in parallel

GitHub also comes with an amazing matrix functionality that lets you define a set of variables that are then used to construct different combinations to cover all cases. As you can tell by this confusing explanation, I failed math every single time it was a subject, so here's a table to explain the same thing and then we'll see how to use this in GitHub Actions.

|         |      Windows      |      MacOS      |      Ubuntu      |
|---------|-------------------|-----------------|------------------|
| Stable  | Windows + Stable  | MacOS + Stable  | Ubuntu + Stable  |
| Beta    | Windows + Beta    | MacOS + Beta    | Ubuntu + Beta    |
| Nightly | Windows + Nightly | MacOS + Nightly | Ubuntu + Nightly |

> {{< sub "This particular matrix is for Rust, to test a codebase across Windows, Ubuntu, and macOS using the Rust stable, beta, and nightly toolchains." >}}

In GitHub Actions, we can simply provide the platforms (Windows, MacOS and, Ubuntu) and the Rust channels (Stable, Beta, and Nightly) and have it figure out how to make the table above. Here's how we do it:

```yaml
jobs:
  check-rust-code:
    # Make the job run on the matrix' current OS
    runs-on: ${{ matrix.os }}
    strategy:
      # Defines a matrix strategy
      matrix:
        # Sets the OSes we want to run jobs on
        os: [ubuntu-latest, windows-latest, macOS-latest]
        # Sets the Rust channels we want to test against
        rust: [stable, beta, nightly]

    steps:
    - uses: actions-rs/toolchain@v1
      with:
        profile: minimal
        components: rustfmt, clippy
        # Installs the Rust toolchain for the matrix' current Rust channel
        toolchain: ${{ matrix.rust }}
```

This will automatically generate 9 (3 platforms * 3 Rust channels) parallel jobs to test this entire configuration.

## Make a job run after another job

Since you can define more than one job in one Actions workflow, you can also leverage that functionality to define more complex requirements for their execution. More real world examples!

LeakCanary has a checks job that runs on each push to the main branch and on each pull request, and they wanted to add support for snapshot deployment to finally retire Travis CI. To make this happen, I simply added a new job to the same workflow, and made it run only on push events. For added guarantees, I also made the deployment job have a dependency on the checks job. This ensures that there won't be a snapshot deployment until all tests are passing on main. The relevant parts of the workflow configuration are here:

```yaml
on:
  pull_request:
  push:
    branches:
      - main

jobs:
  checks:
  # Runs automated unit and instrumentation tests

  snapshot-deployment:
  # Only run if the push event triggered this workflow run
  if: "github.event_name == 'push'"
  # Run after the 'checks' job has passed
  needs: [checks]
```

# Mitigating security concerns wih Actions

GitHub Actions benefits from a vibrant ecosystem of user-authored actions, which opens it up to equal opportunities for abuse. It is relatively easy to work around the common ones, and I'm going to outline them here. I'm no authority on security, and these recommendations are based on a combination of my reading and understanding. These *should* be helpful, but this list is not exhaustive, and you should exercise all the caution you can.

## Use exact commit hashes rather than tags

Tags are moving qualifiers, and can be force pushed at any moment. If the repository for an Action you use in your workflows is compromised, the tag you use could be force pushed with a malicious version that exfiltrates secrets to a third-party server. Auditing the source of a repository at a given tag, then using the SHA1 commit hash it currently points to as the version alleviates that concern due to it being extremely difficult to fake a new commit with the exact hash.

To get the commit hash for a specific tag, head to the Releases page of the repository, then click the short SHA1 hash below the tag name and copy the full hash from the URL.

> // TBD: image

An alternative to this approach is to vendor each third-party action you use into your own repository, and then use the local copy as the source. This puts you in charge of manually syncing to each version, but allows you to use the safer "Only allow actions from within this repository" option in your repository's Actions settings. Having to manually sync with each release also gives you slightly better visibility into the changes between versions since they'd be available in a single PR diff.

To use an Action from a local directory, replace the `uses:` line with the relative path to the local copy in the repository.

```diff
job:
  checks:
    - name: Checkout repository
    # Assuming the copy of actions/checkout is at .github/actions/checkout
-   - uses: actions/checkout@v2
+   - uses: ./.github/actions/checkout
```

## Replace `pull_request_target` with `pull_request`

`pull_request_target` grants a PR access to a github token that can write to your repository, exposing your code to modification by a malicious third-party who simply needs to open a PR against your repository. Most people will already be on `pull_request`, but if you are not, audit your requirements and make the switch.

```diff
-on: [push, pull_request_target]
+on: [push, pull_request]
```

{{< horizontal_line >}}

And that's the end of this far too long post. If you read it all, I thank you for your patience. I'm still learning about Actions, and if you have a similar trick that I did not cover here, I'd love to hear about it! Comment below or just tweet at me on [@msfjarvis](https://twitter.com/msfjarvis) :)
