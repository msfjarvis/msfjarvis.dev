+++
categories = ["automation"]
date = 2023-01-08
summary = "Renovate is an extremely powerful tool for keeping your dependencies up-to-date, and its flexibility is often left unexplored. I'm hoping to change that."
draft = true
slug = "tips-and-tricks-for-using-renovate"
tags = ["dependency-management", "renovate"]
title = "Tips and tricks for using Renovate"
+++

[Mend Renovate](https://www.mend.io/free-developer-tools/renovate/) is a free to use dependency update management service powered by the open-source [renovate](https://github.com/renovatebot/renovate), and is a compelling alternative to GitHub's blessed solution for this problem space: [Dependabot](https://docs.github.com/en/code-security/dependabot). Renovate offers a significantly larger suite of supported language ecosystems compared to Dependabot as well as fine-grained control over where it finds dependencies, how it chooses updated versions, and a lot more. TL;DR: Renovate is a massive upgrade over Dependabot and you should evaluate it if _any_ aspect of Dependabot has caused you grief, there's a good chance Renovate does it better.

I'm collecting some tips here about "fancy" things I've done using Renovate that may be helpful to other folks. You'll be able to find more details about all of these in their very high quality docs at [docs.renovatebot.com](https://docs.renovatebot.com/).

## Disabling updates for individual packages

There are times where you're sticking with an older version of a package (temporarily or otherwise) and you just don't want to see PRs bumping it, wasting CI resources for an upgrade that will probably fail and is definitely not going to be merged. Renovate offers a convenient way to do this:

```json
{
  packageRules: [
    // 
    {
      managers: ["gradle"],
      packagePatterns: ["^com.squareup.okhttp3"],
      enabled: false,
    },
  ],
}
```
