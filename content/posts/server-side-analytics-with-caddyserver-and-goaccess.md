+++
categories = []
date = 2019-12-17T12:51:00Z
draft = true
slug = "serverside-stats-with-caddyserver-and-goaccess"
tags = []
title = "Server-side analytics with Caddyserver and Goaccess"

+++
I'll start off with a very obvious disclaimer: **If you're not self-hosting your site, this is not for you**.

With that out of the way, some introductions are in order. [Caddyserver](https://caddyserver.com) is my favorite webserver by far, being very easy to configure and manage. It also has automatic HTTPS through [Let's Encrypt](http://letsencrypt.org/). [Goaccess](https://goaccess.io/) is real-time log analyzer which works both in the terminal as well as the browser.

## Getting the tools

1. Get Caddy from [here](https://caddyserver.com/v1/download). You want v1 for now, as v2 is still in beta and I haven't tested it because of a missing feature critical to my deployment.
2. If you have never used Caddy before and would like some real-life examples, you can check out my [server-config](https://github.com/msfjarvis/server-config) repository on GitHub for the Caddyfile I use for my websites as well as the systemd unit for it. I'm not a massive fan of Docker, but there are third-party docker images that you can use if that's your thing. No judgements in this town.
3. Install [Goaccess](https://goaccess.io). It's available in distro repositories but chances are it's outdated, so use their [official repo](https://goaccess.io/download#official-repo) on Ubuntu and friends.

## Putting the pieces together