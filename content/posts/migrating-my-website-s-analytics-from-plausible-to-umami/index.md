+++
title = "Migrating my website's analytics from Plausible to Umami"
date = "2026-01-10T00:40:00+05:30"
lastmod = "2026-01-10T00:40:00+05:30"
summary = "Frustrated by ClickHouse's high disk usage, I ditched Plausible for Umami"
categories = [ "devops" ]
tags = [ "plausible", "umami", "clickhouse", "analytics", "self-hosting" ]
draft = false
+++
On January 5th I had another minor outage on one of my servers due to a full disk, caused in part by misconfigured Forgejo data dumps. In the process of fixing that I discovered that most of my server disk was actually being used by [ClickHouse](https://clickhouse.com), which is holding data for my [Plausible](https://plausible.io) instance that records page views for this website.

Why does it need 108 gigabytes to store 102K page views? I wish I could tell you. One of the developers of Plausible [replied to my grumbling](https://hachyderm.io/@ifthenelse/115843953290917862) explaining that it was likely ClickHouse collecting a ton of logs which was the real storage hog rather than the data itself. By that point I had already finished migrating off to [Umami](https://umami.is/) and deleted the offending ClickHouse data so I couldn't verify the hypothesis.

The migration itself was quite simple so I'll reproduce the steps below for any interested people looking for migration steps.

- I [set up the NixOS module for Umami](https://git.msfjarvis.dev/msfjarvis/dotfiles/commit/323fccb9b16e805f665337284b8a4ae8313c0b6a), and [enabled it](https://git.msfjarvis.dev/msfjarvis/dotfiles/commit/94419eb680752f573916b133d8ca6bd3162b5969) on a fresh subdomain to run it alongside Plausible during the migration.
    - Umami has this weird default of creating an admin account with the \`admin:umami\` credentials so make sure the first thing you do is change this password. I wish they would add OIDC support already so I could stop relying on this.
- I logged into Plausible and following [their docs](https://plausible.io/docs/export-stats#export-all-stats-to-date), obtained a ZIP file of all my data till date.
- Umami does not have any first-party support for importing data, so I had to use a [third-party Python script](https://github.com/JeongJuhyeon/plausible-to-umami) that converted my ZIP file of CSVs from Plausible into a 5 megabyte .sql file that I could import into the Umami database table. The conversion worked for me in the first try, which was quite the relief.
- With the SQL file in hand, I was able to easily import it into the running Umami instance by running `sudo -u umami psql -U umami -d umami < plausible_migration.sql`. This worked flawlessly as well, and I was able to confirm on the Umami web interface that my data had been successfully imported.
- In my website, I [switched the JS script](https://git.msfjarvis.dev/msfjarvis/msfjarvis.dev/commit/b665eada40250af746d7f5212f6fba5d35086f3e) to the one I got from Umami, and updated the [Content Security Policy headers](https://git.msfjarvis.dev/msfjarvis/msfjarvis.dev/commit/e5e4406b3863793eae4a8027b0ed64e92abc2018) to match.
- Once this was deployed, I quickly clicked through the site and was able to see my session in Umami and confirm it was working.

And that's kind of it! After this I turned off Plausible and was able to delete the ClickHouse directory and reclaim the nearly half of my 256 GB disk it had been keeping hostage. Umami's lack of OIDC and easy import options is definitely a sore point, but with how easy the whole thing ended up being for me I can live with it for the time being. Interestingly, [Plausible only lasted 8 months](/posts/migrating-from-simple-analytics-to-self-hosted-plausible/) before I moved out of it. I should've been more wary of ClickHouse than I was of MySQL when I chose Plausible over Matomo :)
