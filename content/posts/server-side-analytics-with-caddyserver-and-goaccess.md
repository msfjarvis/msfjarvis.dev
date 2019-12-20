+++
categories = []
date = 2019-12-17T12:51:00Z
draft = true
slug = "serverside-stats-for-caddyserver-with-goaccess"
tags = []
title = "Server-side analytics for Caddyserver using Goaccess"

+++
I'll start off with a very obvious disclaimer: **If you're not self-hosting your site with Caddy, this is not for you**.

With the ever looming reality of Google controlling too much of the web, I decided to start making a change on a personal level, and ditch [Google Analytics](https://analytics.google.com/) for my [blog](https://msfjarvis.dev). I however *did* like having some statistics to know what content works the best for me and direct my efforts towards putting more of it out for the world to see.

I did some digging around, and came across [Goaccess](https://goaccess.io), a server-side log analyzer that pairs with nearly all possible log formats to generate HTML, CSV and/or JSON reports.

{{< gfycat DapperPlaintiveAmericanrobin >}}


Except all guides I found 