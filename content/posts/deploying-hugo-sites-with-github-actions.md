+++
categories = ["hugo"]
date = 2019-11-06T00:00:00Z
draft = true
slug = "deploying-hugo-sites-with-github-actions"
tags = ["hugo", "github actions", "static sites"]
title = "Deploying Hugo sites with GitHub actions"

+++
For the longest time, I have been used the [git middleware](http://github.com/abiosoft/caddy-git) for [caddyserver](https://caddyserver.com) to constantly deploy my [Hugo](https://gohugo.io) site from [GitHub](https://github.com/msfjarvis/msfjarvis.website).

But this approach had a few problems, notably force pushing (I know, shush) caused the repository to break because the plugin didn't support those. While not frequent, it was annoying enough to seek alternatives.

Enter [GitHub Actions](https://github.com/features/actions).

GitHub's in-built CI/CD solution is quite powerful and I decided to leverage it for automated deploys.
