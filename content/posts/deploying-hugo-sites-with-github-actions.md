+++
categories = ["hugo"]
date = 2019-12-04T09:40:00Z
slug = "deploying-hugo-sites-with-github-actions"
tags = ["hugo", "github actions", "static sites"]
title = "Deploying Hugo sites with GitHub Actions"
description = "GitHub Actions are awesome! Learn how to use it for continuous delivery of your static sites."
+++

For the longest time, I have used the [caddy-git] middleware for [caddyserver](https://caddyserver.com) to constantly deploy my [Hugo](https://gohugo.io) site from [GitHub](https://github.com/msfjarvis/msfjarvis.website).

But this approach had a few problems, notably force pushing (I know, shush) caused the repository to break because the plugin didn't support those. While not frequent, it was annoying enough to seek alternatives.

Enter [GitHub Actions](https://github.com/features/actions).

GitHub's in-built CI/CD solution is quite powerful and easily extensible. I decided to give it a shot and use it for automated deployments.

Now, my use case isn't the most straightforward. I maintain two sites out of the same source repository, one production site with all my published posts, and another with all my drafts enabled so I can check my WIP posts live to find any formatting mistakes I may have overlooked when writing through [Forestry](https://forestry.io) or a text editor. I am also in the habit of creating and fixing my own problems so I prefer self-hosted solutions as and when possible.

## Step 1 - Deployment

The first part of this endeavour involved finding a new way to move static assets to the server. I thought about emulating how [caddy-git] works and using `ssh` to do a pull-and-build on my server itself. Then I found [this](https://github.com/peaceiris/actions-hugo) action that allows me to install `hugo` in the container for the build. That's when I decided to do the building in the Actions pipeline and push built assets using `rsync`.

## Step 2 - Execution

To handle my two-sites-from-one-repo usecase, I setup a build staging -> publish staging -> build prod -> publish prod pipeline.

{{< highlight yaml >}}
- name: Build staging
  run: hugo --minify -DEFb=https://staging.msfjarvis.website

- name: Deploy to staging
  run: source $GITHUB_WORKSPACE/ci/deploy.sh
  env:
    ACTIONS_DEPLOY_KEY: ${{ secrets.ACTIONS_DEPLOY_KEY }}
    SSH_USERNAME: ${{ secrets.SSH_USERNAME }}
    SERVER_ADDRESS: ${{ secrets.SERVER_ADDRESS }}
    SERVER_DESTINATION: ${{ secrets.SERVER_DESTINATION_STAGING }}
    SSH_PORT: ${{ secrets.SSH_PORT }}

- name: Build prod
  run: hugo --minify

- name: Deploy to prod
  run: source $GITHUB_WORKSPACE/ci/deploy.sh
  env:
    ACTIONS_DEPLOY_KEY: ${{ secrets.ACTIONS_DEPLOY_KEY }}
    SSH_USERNAME: ${{ secrets.SSH_USERNAME }}
    SERVER_ADDRESS: ${{ secrets.SERVER_ADDRESS }}
    SERVER_DESTINATION: ${{ secrets.SERVER_DESTINATION_PROD }}
    SSH_PORT: ${{ secrets.SSH_PORT }}
{{< / highlight >}}

You can find the `ci/deploy.sh` script [here](https://github.com/msfjarvis/msfjarvis.website/blob/src/ci/deploy.sh). It's a very basic script that sets up the SSH authentication and rsync's the built site over.

[caddy-git]: http://github.com/abiosoft/caddy-git