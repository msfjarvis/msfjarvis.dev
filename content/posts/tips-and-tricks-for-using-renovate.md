---
categories:
  - automation
date: 2023-01-15T09:15:15.950Z
summary: Renovate is an extremely powerful tool for keeping your dependencies
  up-to-date, and its flexibility is often left unexplored. I'm hoping to change
  that.
draft: true
slug: tips-and-tricks-for-using-renovate
tags:
  - dependency-management
  - renovate
title: Tips and tricks for using Renovate
---
[Mend Renovate](https://www.mend.io/free-developer-tools/renovate/) is a free to use dependency update management service powered by the open-source [renovate](https://github.com/renovatebot/renovate), and is a compelling alternative to GitHub's blessed solution for this problem space: [Dependabot](https://docs.github.com/en/code-security/dependabot). Renovate offers a significantly larger suite of supported language ecosystems compared to Dependabot as well as fine-grained control over where it finds dependencies, how it chooses updated versions, and a lot more. TL;DR: Renovate is a massive upgrade over Dependabot and you should evaluate it if *any* aspect of Dependabot has caused you grief, there's a good chance Renovate does it better.

I'm collecting some tips here about "fancy" things I've done using Renovate that may be helpful to other folks. You'll be able to find more details about all of these in their very high quality docs at [docs.renovatebot.com](https://docs.renovatebot.com/).

## Disabling updates for individual packages

There are times where you're sticking with an older version of a package (temporarily or otherwise) and you just don't want to see PRs bumping it, wasting CI resources for an upgrade that will probably fail and is definitely not going to be merged. Renovate offers a convenient way to do this:

```json
{
  "packageRules": [
    {
      "managers": ["gradle"],
      "packagePatterns": ["^com.squareup.okhttp3"],
      "enabled": false,
    },
  ],
}
```

## Grouping updates together

Renovate already includes preset configurations for [monorepos](https://github.com/renovatebot/renovate/blob/b4d1ad8e5210017a3550c9da4342b0953a70330a/lib/config/presets/internal/monorepo.ts) that publish multiple packages with identical versions, but you can also easily add more of your own. As an example, here's how you can combine updates of the serde crate and its derive macro.

```json
  "packageRules": [
    {
      "managers": [
        "cargo"
      ],
      "matchPackagePatterns": [
        "serde",
        "serde_derive"
      ],
      "groupName": "serde"
    }
  ]
```

## Set a semver range for upgrades

Sometimes there are cases where you may need to set an upper bound on a package dependency to avoid breaking changes or regressions. Renovate offers intuitive support for the same.

```json
  "packageRules": [
    {
      "matchPackageNames": ["com.android.tools.build:gradle"],
      "allowedVersions": "<=7.4.0"
    }
  ]
```

## Supporting non-standard dependency declarations

Dependency versions are sometimes specified without their package names, for example in config files. These cannot be automatically detected by Renovate, but you can use a regular expression to teach it how to identify these dependencies.

For example, you can specify the version of Hugo to build your Netlify site with in the `netlify.toml` file in your repository.

```toml
[build.environment]
  HUGO_VERSION = "0.109.0"
```

This is how the relevant configuration might look like with Renovate

```json
  "regexManagers": [
    {
      "description": "Update Hugo version in Netlify config",
      "fileMatch": [".toml$"],
      "matchStrings": [
        "HUGO_VERSION = \"(?<currentValue>.*?)\""
      ],
      "depNameTemplate": "gohugoio/hugo",
      "datasourceTemplate": "github-releases"
    }
  ],
```

You can read more about Regex Managers [here](https://docs.renovatebot.com/modules/manager/regex/).

## Making your GitHub Actions usage more secure

According to GitHub's [official recommendations](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions), you should be using exact commit SHAs instead of tags for third-party actions. However, this is a pain to do manually. Instead, allow Renovate to manage it for you!

```json
{
  "extends": [
    "config:base",
    ":dependencyDashboard",
    "helpers:pinGitHubActionDigests",
 ﻿ ]
}﻿
```

## Automatically merging compatible updates

Every person with a JavaScript project has definitely loved getting 20 PRs from Dependabot about arbitrary transitive dependencies that they didn't even realise they had. With Renovate, that pain can also be automated away if you have a robust enough test suite to permit automatic merging of minor updates.

```json
{
  "automergeType": "branch",
  "packageRules": [
    {
      "description": "Automerge non-major updates",
      "matchUpdateTypes": ["minor", "patch", "digest", "lockFileMaintenance"],
      "automerge": true
    },
  ]
}
```

With this configuration, Renovate will push compatible updates to `renovate/$depName` branches and merge it automatically to your main branch if CI runs on the branch and passes. To make that happen, you will also need to update your GitHub Actions workflows.

```diff
 name: Run tests
 on:
   pull_request:
     branches:
       - main
+  push:
+    branches:
+      - renovate/**
```

## Closing notes

This list currently consists exclusively of things I've used in my own projects. There is way more you can achieve with Renovate, and I recommend going through the docs at [docs.renovatebot.com](https://docs.renovatebot.com/) to find any useful knobs for the language ecosystem you wish to use it with. If you come across something interesting not covered here, let me know either below or on Mastodon at [@msfjarvis@androiddev.social](https://androiddev.social/@msfjarvis)!
