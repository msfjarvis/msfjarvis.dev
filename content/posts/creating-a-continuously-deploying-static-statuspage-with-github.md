+++
categories = ["webdev", "github-actions"]
date = 2020-02-05
description = "GitHub Actions paired with GitHub Pages provides an excellent CD platform for a status page. Here's how I used it to create mine."
devLink = "https://dev.to/msfjarvis/creating-a-continuously-deploying-static-statuspage-with-github-3ol2"
slug = "creating-a-continuously-deploying-static-statuspage-with-github"
socialImage = "uploads/statuspage_social.webp"
tags = ["github pages"]
title = "Creating a continuously deploying static statuspage with GitHub"
+++

A status page is essentially a web page that reports the health and uptime of an organization's various online services. [GitHub](https://www.githubstatus.com/) has one and so does [Cloudflare](https://www.cloudflarestatus.com/). Most of these are powered by an [Atlassian](https://www.atlassian.com/) product called [Statuspage](https://www.statuspage.io/) but it's not always the [cheapest solution](https://www.statuspage.io/pricing?tab=public).

For hobbyist projects without any real budget (like this site and the couple others I run), Statuspage pricing is often too steep. To this effect, many open source projects exist to let you generate your own status page through an application that handles continuous updates of it. That works too! But what if you don't have a separate server to run the status page service on? Hosting on a server with other applications that its supposed to track is obviously not an option. Enter [static_status](https://github.com/Cyclenerd/static_status).

[static_status](https://github.com/Cyclenerd/static_status) is a bash script that as its name suggests, generates a fully static webpage that functions as a status page for the services you ask it to monitor. You can check out how it looks at [status.msfjarvis.dev](https://status.msfjarvis.dev). Pretty neat, right?

[status.msfjarvis.dev](https://status.msfjarvis.dev) is powered by a GitHub Action running every 30 minutes to deploy the generated static page to GitHub Pages and barely takes any time to set up. Here's how it works.

- First thing that you want to do is to setup the `CNAME` record that will let GitHub Pages service your status page to a subdomain of your website. Head to your domain registrar (Cloudflare for me) and add a CNAME record for `<your github username>.github.io`

![CNAME record for status.msfjarvis.dev at Cloudflare](/uploads/statuspage_cname_record.webp)

- Next, create a GitHub repository that will hold the Actions workflow for generating your status page as well as the actual status page itself. This repo can be private, as the generated sites are always publicly available.

![GitHub repository for our status page](/uploads/statuspage_github_repo.webp)

- Clone this empty repository. Now create a file with the name of `CNAME` and enter your custom domain into it. This lets GitHub Pages know where to redirect users if they ever access the site through your `.github.io` subdomain. Commit this file.

![CNAME file in repository](/uploads/statuspage_cname_file.webp)

- A quick glance at the static_status README will inform you about the `config` file that it uses to configure itself, and status_hostname_list.txt which has a list of all services it needs to check. `config` is easy to understand and modify, so I'll skip it (you can diff [mine](https://github.com/msfjarvis/status.msfjarvis.dev/blob/master/config) with upstream and use the changes to educate yourself should the need arise). This part should be very straightforward, though I did encounter a problem where using `ping` as the detection mechanism caused sites to falsely report as down. Switching to `curl` resolved the issue.

- Finally, time to add the automation to this whole thing. Any CI solution with a cron/schedule option will work, I used GitHub Actions, you don't have to. I set a schedule of once every 30 minutes, depending on what platform you're using for CD and what services you're hosting, you might want to choose a shorter period. Here's my GitHub Actions workflow.

```yaml
name: "Update status page"
on:
  schedule:
    - cron: "*/30 * * * *"
  push:

jobs:
  update-status-page:
    runs-on: ubuntu-latest
    steps:
      - name: Install traceroute
        run: sudo apt-get install traceroute -y
      - name: Checkout config
        uses: actions/checkout@v2
      - name: Checkout static_status
        uses: actions/checkout@v2
        with:
          repository: Cyclenerd/static_status
          path: static_status
          clean: false
      - name: Generate status page
        run: |
          mkdir -p static_status/status/
          cp config static_status/
          cp status_hostname_list.txt static_status/
          cp CNAME static_status/status/
          cd static_status/
          rm status_maintenance_text.txt
          ./status.sh

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v2
        env:
          PERSONAL_TOKEN: ${{ secrets.PERSONAL_TOKEN }}
          PUBLISH_BRANCH: gh-pages
          PUBLISH_DIR: ./static_status/status
          SCRIPT_MODE: true
        with:
          username: "MSF-Jarvis"
          useremail: "msfjarvis+github_alt@gmail.com"
```

This installs `traceroute` which is needed by static_status, checks out my repository, clones static_status to the static_status directory, copies over config and hostname list to that folder, places the `CNAME` file in the static_status/status directory, runs the script to generate the status page, and finally publishes the static_status/status folder to the `gh-pages` branch, as my bot account.

The result of this is a simple and fast statuspage that can be hosted anywhere by simply coping the single `index.html` over. If you have a separate server to run this off, you can get away with replacing this entire process with a single crontab command. Being a bash script lets static_status run on essentially any Linux-based platform so you can actually deploy this from a Raspberry Pi with no effort. Hope this helps you to create your own status pages!
