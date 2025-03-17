+++
categories = ["journaling"]
date = 2025-03-17T11:08:37+05:30
lastmod = 2025-03-17T11:08:37+05:30
summary = "An experience report of using Obsidian for a week, coming from a year of Logseq"
draft = false
slug = "the-obsidian-migration--one-week-later"
tags = ["logseq", "obsidian", "notes"]
title = "The Obsidian Migration - One Week Later"
+++

In my [last post](/posts/migrating-from-logseq-to-obsidian) I had a list of to-dos to fully finish up the migration, which I'll reproduce below:

> - I used internal links of `[[this format]]` pretty liberally in my Logseq graph as a tag system, which will need migration to Obsidian's tags mechanism.
>
> - Some of my pages refer to daily journal pages using a humanized date variant which Logseq automatically converted to proper links, which does not work in Obsidian.
>
> - There seems to be no automatic tagger for Obsidian similar to how [logseq-automatic-linker](https://github.com/sawhney17/logseq-automatic-linker) works.

## Migrating dates and tags to Obsidian

I haven't found a solution for automated tagging yet, but inspired by Simon Willison's [post about how he uses LLMs for code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) I decided to have GitHub Copilot write out a Python script to perform the migration of Logseq-isms to the appropriate Obsidian-native patterns.

The choice of Python was for multiple reasons: it's fast enough for the job, I understand it well, and it can get much farther without needing third-party dependencies.

There wasn't admittedly a whole lot to this process, since all I was doing is reviewing and running some 100 odd lines of Python then hard resetting my repo after it did the wrong thing. My initial prompt was this:

```plaintext
Write a Python script using only the standard library to process an Obsidian
vault and migrate Logseq patterns to Obsidian's systems in the markdown files.
Below is a list of changes to make:

1. Convert any `[[Thing]]` style links to use Obsidian-native tags by adding a
`#` prefix, resulting in `#Thing`. If there are spaces in the link text,
convert them to underscores.

2. If a link's text matches the date format `May 8th, 2024`, replace its text
by changing the date format to YYYY-MM-DD. In the given example, the output
should be `[[2024-05-08]]`.
```

The first output from this was unsurprisingly buggy, the script converted `[[May 13th, 2024]]` to `#2024-05-13` instead of `[[2024-05-13]]`. The second iteration did not resolve the bug either, but in the third one progress was made.

This was where Copilot impressed me a bit. After running the third iteration and finding a bug in the results, I told the chatbot that the date `Jun 8th, 2024` was not being converted and it was able to quickly clock that this was caused by my usage of `May` in the initial prompt which made it look only for full month names, while `Jun` is obviously abbreviated. I'm not sure if I would've figured that one out right away, but it was a good way to also learn more about the Python standard library's date formatting facilities.

The final script is available [here](https://gist.github.com/msfjarvis/1892c898df746cfa1d24932a02a1da82), with individual revisions so you can step through the changes made by Copilot as I prompted it.

## Getting set up on mobile

This was the bit I was more excited for, because one major advantage of using Obsidian on mobile that I didn't realize earlier was that the same plugins Just Work™️. As far as I could tell, Logseq did not have support for plugins on mobile which mas a little annoying because how I interacted with the app changed across platforms even though there was no technical reason for it to. In Obsidian everything works out-of-the-box since plugins get vendored into your vault so you can actually modify and review the plugin code you're running.

My existing workflow on Android involved manually committing and pushing changes to my graph/vault via [MGit](https://github.com/maks/MGit) which was too many clicks in the MGit app and was getting a little frustrating over time. I [asked on the Fediverse](https://androiddev.social/@msfjarvis/114136599118536735) if someone was aware of a newer Git client for Android and very quickly discovered [PuppyGit](https://github.com/catpuppyapp/PuppyGit).

Once I had removed Logseq and imported my existing vault into Obsidian (I've opted to re-use my existing Git repository), I followed PuppyGit's guide to [setting up automatic syncing with Obsidian](https://www.patreon.com/posts/puppygit-auto-122757321) which worked flawlessly. It works by mapping a list of apps to a list of repositories that they interact with, and using an accessibility service monitors when apps are launched or closed, upon which it would pull remote changes to the repos or commit and push respectively.

The Git plugin I was using for my desktop didn't work on Android since it required a `git` binary, but they helpfully include an option to disable it only for the current device which let me delegate to PuppyGit on mobile with no issues.

{{<horizontal_line>}}

A week into it I find myself much happier using Obsidian than I ever was with Logseq, and I've even started using it for more things beyond journaling such as taking meeting notes and organizing my tasks which I found too unintuitive to achieve with Logseq. Logseq excels at a daily journaling tool but once my needs started expanding it was pretty clear that Obsidian really is the all-rounder I needed.
