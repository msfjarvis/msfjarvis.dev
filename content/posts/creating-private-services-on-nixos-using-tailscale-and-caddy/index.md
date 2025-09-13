+++
title = "Creating private services on NixOS using Tailscale and Caddy"
date = "2025-09-13T21:18:00+05:30"
lastmod = "2025-09-13T21:25:00+05:30"
summary = "A simple guide to setting up private services on NixOS using Tailscale and Caddy with authentication."
categories = [ "selfhosting", "nixos" ]
tags = [ "caddy", "nixos", "tailscale" ]
draft = true
slug = "creating-private-services-on-nixos-using-tailscale-and-caddy"
+++
[Tailscale](https://tailscale.com) is a mesh VPN that makes it dead simple to connect almost any device together in a private network. [Caddy](https://caddyserver.com) is a web server that focuses on ease of use and automatic HTTPS. I am a fan of both of these, and I was very excited to discover that Tailscale has an experimental [integration with Caddy](https://github.com/tailscale/caddy-tailscale) that leverages their [`tsnet`](https://tailscale.com/kb/1244/tsnet) library to allow creating unique Tailscale addresses for individual virtual hosts in your Caddy configuration. Here's a quick run down of how to set this up on NixOS.

## Installing caddy-tailscale for NixOS

As of the latest NixOS release, the Caddy package in nixpkgs supports including plugins directly which greatly simplifies this step. As an example, here's how I include the caddy-tailscale plugin with the excellent [caddy-defender](https://github.com/JasonLovesDoggo/caddy-defender) that lets me drop traffic from AI scrapers more safely.

> You can also keep the package definition in a separate file [like this](https://github.com/msfjarvis/dotfiles/blob/94b443ce6748a1897b7b839e1564eca34bfcbe3e/packages/caddy-with-plugins/default.nix), and use [this script](https://github.com/msfjarvis/dotfiles/blob/94b443ce6748a1897b7b839e1564eca34bfcbe3e/dev/caddy/update_caddy_plugins.py) to keep it up-to-date. DISCLAIMER: The script was vibe coded by Claude, all I've done is checked it for obviously silly shit.

```diff
   services.caddy = {
     enable = true;
+    package =
+      pkgs.caddy.withPlugins {
+        plugins = [
+          "github.com/jasonlovesdoggo/caddy-defender@v0.8.5"
+          "github.com/tailscale/caddy-tailscale@v0.0.0-20250207163903-69a970c84556"
+        ];
+        hash = "sha256-z+zj3rfXbyxldRjO1yoLD77ACRWEAofzMDiZe/bHAqw=";
+     }
     globalConfig = ''
       servers {
```

This will swap out the `caddy` binary in your NixOS configuration with one that has the `caddy-tailscale` module patched in. You will also need to provide a Tailscale authkey to allow the `caddy-tailscale` module to interact with the Tailscale API and provision new nodes in your Tailnet. This can be done by setting the `TS_AUTHKEY` environment variable in your Caddy service configuration. Here's an example of how to do so using [`sops-nix`](https://github.com/Mic92/sops-nix):

```nix
age.secrets.ts-authkey = {
  file = "secrets/ts-authkey.age";
  owner = config.services.caddy.user;
  group = config.services.caddy.group;
  mode = "600";
};
systemd.services.caddy.serviceConfig.EnvironmentFile = config.age.secrets.ts-authkey.path;
```

## Setting up your first private service

Now we're ready to rumble. To showcase the full capabilities of `caddy-tailscale`, we're going to set up [Grafana](https://grafana.com) with [proxy authentication](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/auth-proxy/) and let Tailscale [handle the authentication](https://github.com/tailscale/caddy-tailscale?tab=readme-ov-file#authentication-provider) for us. Here's a simple example (N.B. `$TAILNET_NAME` should be replaced with your Tailscale network name.):

```nix
services.caddy.virtualHosts = {
  "https://${config.services.grafana.settings.server.domain}" = {
    extraConfig = ''
      bind tailscale/grafana # This will create a new node at grafana.$TAILNET_NAME.ts.net
      tailscale_auth # Enables the in-built authentication provider
      reverse_proxy ${config.services.grafana.settings.server.http_addr}:${toString config.services.grafana.settings.server.http_port} {
        header_up X-Webauth-User {http.auth.user.tailscale_user} # Forwards your Tailscale user ID to Grafana. Usually your email address.
      }
    '';
  };
};

services.grafana = {
  enable = true;
  settings = {
    "auth.proxy" = {
      enabled = true; # Enable proxy-based authentication
      auto_sign_up = true; # Automatically create new accounts for people who access the service
      enable_login_token = false; # Do not store login cookies, instead always relying on proxy authentication
    };
    server = {
      domain = "grafana.$TAILNET_NAME.ts.net";
      http_addr = "127.0.0.1";
      http_port = 2342;
    };
  };
};
```

This configuration will set up a new Grafana instance at `https://grafana.$TAILNET_NAME.ts.net` that is only accessible to members of your Tailscale network. When you visit the URL, your Tailscale identity will be used to log you into your existing Grafana account, or sign you up if this is your first time visiting the service.

{{<figure src="grafana-profile.webp" alt="The profile page on Grafana, showing the name, email and username fields with an additional 'synced via auth proxy' label next to them. The email and username have been blurred out to redact them for privacy reasons" title="Grafana profile showing that user identification is being done via the Tailscale proxy" loading="lazy">}}

## Caveats

While this approach works great for most needs, there are a few caveats to be aware of:

- Each service created this way registers as a new device in your Tailnet. Make sure to remain aware of the devices limit on your account.
- Since each "virtual" device being created via this is technically backed by your physical machine, the "Services" tab in your Tailscale dashboard will end up with duplicate entries of services that are running on the same machine. For example, I run 5 `caddy-tailscale` services on my server, which results in 6 entries of the SSH service being listed. This may be a deal breaker to you, depending on how you use the Tailscale dashboard.

## Conclusion

Despite its experimental status, `caddy-tailscale` is pretty powerful and exposes enough functionality to cover most basic use cases. I've been pretty happy running it in my homelab for the past couple months and I'm excited to see how it evolves in the future. If you have any questions or corrections, please let me know either in the comments below or on [Mastodon](https://androiddev.social/@msfjarvis).
