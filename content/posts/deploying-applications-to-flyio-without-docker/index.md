+++
categories = ["devops"]
date = 2024-10-05
lastmod = 2024-10-05
summary = "A quick guide to deploying apps to Fly.io without a local Docker installation"
draft = false
slug = "deploying-applications-to-flyio-without-docker"
tags = ["fly.io", "docker", "nix"]
title = "Deploying applications to Fly.io without Docker"
+++

> This post assumes basic familiarity with Fly.io, the flyctl CLI and Nix.

{{< horizontal_line >}}

[Fly.io](https://fly.io) is one of the many players in the "We run your app close to your users" space. I've used their services for just over a couple years to run my personal instance of [linkleaner](https://github.com/msfjarvis/linkleaner). Recently I ran into a combination of a platform outage and localized issue that necessitated recreating the app from scratch, and I decided to try doing so locally rather than my usual CI-based deployment system.

Deployments with Fly.io usually start with a Docker/OCI image. Fly.io requires this image to either exist in their own OCI registry at registry.fly.io, or any other publicly accessible registry. The common way to do this is to use a Dockerfile and build the image locally, then use their [flyctl](https://github.com/superfly/flyctl) CLI to upload that image from your local Docker registry to registry.fly.io and then deploy the app.

Since I use [Nix](https://nixos.org) as my Docker image builder (check out [this talk](https://xeiaso.net/talks/2024/nix-docker-build/) that explains why one would prefer it over Docker itself), I do not run Docker locally and had no plans to start now. This guide is mostly the result of that stubbornness so I intend to keep it short.

## Setting up

The main ingredient of this is the [skopeo](https://github.com/containers/skopeo) CLI that allows one to interact with remote OCI registries. We'll replace the Fly.io Docker integration steps with [skopeo copy](https://github.com/containers/skopeo/blob/03ca12ed56db3e5e46805b0d8a95a1207a0921ea/docs/skopeo-copy.1.md) that allows copying Docker archives directly to a registry.

You're also going to need a Fly.io token to authenticate with registry.fly.io. With `flyctl` installed you can run `fly tokens create deploy` to get an auth token usable for the purpose. I stored mine in a `FLY_AUTH_TOKEN` environment variable that will be referenced later.

## Building and deploying

First we need to build the image. With Nix it is as easy as running `nix build .#container` (since I declare the OCI image as a [package](https://github.com/msfjarvis/linkleaner/blob/69564ab458abe77e55d090d29ff970a68c1a985c/flake.nix#L83-L93) in my Nix configuration) which will generate a symlink at `./result` pointing to a Docker image tarball.

```bash
➜ ls -l result
result ⇒ /nix/store/h0jgv00fg68d7gsaadd11ydpk6wxxn8w-docker-image-linkleaner.tar.gz
```

Now to the actual deployment: assuming your app is already set up (`fly apps create`), you just need to copy this image over to their registry and trigger a new deployment. `skopeo` makes this rather easy.

```bash
skopeo \
  # Remove the need for a policy file since we only need this for a one off thing
  --insecure-policy \
  copy \
  # The source argument, which is a docker image archive at `./result`
  docker-archive:./result \
  # The destination argument, the `build.image` value from your fly.toml
  docker://registry.fly.io/linkleaner:latest \
  # Injecting the previously generated credentials
  --dest-creds x:"$FLY_AUTH_TOKEN" \
  # Docker v2.2 manifest format: https://containers.gitbook.io/build-containers-the-hard-way#registry-format-oci-image-manifest
  # Probably not necessary but I just wanted to be sure
  --format v2s2
```

This will print a bunch of stuff while it's doing its thing and upon success you have now placed your organically built, Docker-free OCI image into the Fly.io registry.

{{< horizontal_line >}}

And that's more or less it! You can now proceed with the usual Fly.io deployment process of running `flyctl deploy` and it'll be able to find the image and run your application:

```bash
➜ flyctl deploy
==> Verifying app config
Validating /home/msfjarvis/code/linkleaner/fly.toml
✓ Configuration is valid
--> Verified app config
==> Building image
Searching for image 'registry.fly.io/linkleaner:latest' remotely...
image found: img_3mno4wk809624k18

Watch your deployment at https://fly.io/apps/linkleaner/monitoring

-------
Updating existing machines in 'linkleaner' with rolling strategy

-------
 ✔ [1/2] Cleared lease for 0801937b607358
 ✔ [2/2] Cleared lease for 9080155dfe0de8
-------
```
