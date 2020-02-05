+++
categories = ["webdev"]
date = 2020-02-05T10:39:26+05:30
draft = true
slug = "creating-a-continuously-deploying-static-statuspage-with-github"
tags = ["webdev", "github actions", "github pages"]
title = "Creating a continuously deploying static statuspage with GitHub"
description = "GitHub Actions paired with GitHub Pages provides an excellent CD platform for a status page. Here's how I used it to create mine."
+++

A status page is essentially a web page that reports the health and uptime of an organization's various online services. [GitHub](https://www.githubstatus.com/) has one and so does [Cloudflare](https://www.cloudflarestatus.com/). Most of these are powered by an [Atlassian](https://www.atlassian.com/) product called [Statuspage](https://www.statuspage.io/) but it's not always the [cheapest solution](https://www.statuspage.io/pricing?tab=public).

For hobbyist projects without any real budget (like this site and the couple others I run), Statuspage pricing is often too steep. To this effect, many open source projects exist to let you generate your own status page through an application that handles continuous updates of it. That works too! But what if you don't have a separate server to run the status page service on? Hosting on a server with other applications that its supposed to track is obviously not an option. Enter [static_status](https://github.com/Cyclenerd/static_status).

[static_status](https://github.com/Cyclenerd/static_status) is a bash script that as its name suggests, generates a fully static webpage that functions as a status page for the services you ask it to monitor. You can check out how it looks at [status.msfjarvis.dev](https://status.msfjarvis.dev). Pretty neat, right?

[status.msfjarvis.dev](https://status.msfjarvis.dev) is powered by a GitHub Action running every 30 minutes to deploy the generated static page to GitHub Pages and barely takes any time to set up. Here's how it works.

- First thing that you want to do is to setup the `CNAME` record that will let GitHub Pages service your status page to a subdomain of your website. Head to your domain registrar (Cloudflare for me) and add a CNAME record for `<your github username>.github.io`

![CNAME record for status.msfjarvis.dev at Cloudflare](/uploads/statuspage_cname_record.png)

- Next, create a GitHub repository that will hold the Actions workflow for generating your status page as well as the actual status page itself. This repo can be private, as the generated sites are always publicly available.

![GitHub repository for our status page](/uploads/statuspage_github_repo.png)

- Clone this empty repository. Now create a file with the name of `CNAME` and enter your custom domain into it. This lets GitHub Pages know where to redirect users if they ever access the site through your `.github.io` subdomain. Commit this file.

![CNAME file in repository](/uploads/statuspage_cname_file.png)

- Finally, time to start creating our workflow for GitHub Actions. A quick glance at the static_status README will inform you about the `config` file that it uses to configure itself, and status_hostname_list.txt which has a list of all services it needs to check. `config` is easy to understand and modify, so I'll skip it (you can diff [mine](https://github.com/msfjarvis/status.msfjarvis.dev/blob/master/config) with upstream and use the changes to educate yourself should the need arise). Instead, I'll cover the `status_hostname_list.txt` file that gave me grief when I was setting this up.
