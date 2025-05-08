+++
title = "Mildly overengineering my Glance configuration"
date = "2025-05-07T23:05:00+05:30"
lastmod = "2025-05-07T23:05:00+05:30"
summary = "The story of setting up a live environment for configuring my Glance dashboard"
categories = [ "nix" ]
tags = [ "nix" ]
draft = false
slug = "mildly-overengineering-my-glance-configuration"
+++
# Setting the scene

I'm a very happy user of the [Glance](https://github.com/glanceapp/glance) dashboard, and make use of it multiple times a day.

As a NixOS user, I have a very popular problem of wanting to iterate on my Glance configuration without having to rebuild my whole system every time to see the change.

One way I've seen this addressed (please message me on `@msfjarvis@androiddev.social` if you can find the actual blog post) is to have some sort of "dev" switch that generates a writable version of your configuration using some [home-manager](https://github.com/nix-community/home-manager) tricks that you can poke at before encoding it into Nix. Turning off the aforementioned "dev" mode will make the configuration go through the more usual Nix ways and give you your declarative system back.

I think that idea is cool! I also think that idea kinda sucks when the configuration is in a "language" you despise, like YAML. Which is where I am!

# Coming up with a solution

At the end of the day, the problem I have is that there are too many intermediate steps between me writing Nix and it being converted into YAML. So let's break it down!

Phase 1: Pull out the Nix bits I need to a standalone file that I can muck around with: [done](https://msfjarvis.dev/g/dotfiles/39c90cb831c6)

Now, we need a way to convert this Nix code into a YAML file that Glance can ingest. I came across a relatively new project that solves exactly this: [nix-converter](https://github.com/theobori/nix-converter).

Running `nix-converter --from-nix -f path/to/file.nix -l yaml` outputs YAML to stdout, ready to be shoved wherever you desire. This worked almost flawlessly, except an easily worked-around issue:

```nix
{
  # This generates the following (incorrect) YAML
  # foo: "baz"
  foo.bar = "baz";
  # This way of declaraing the attrsets works around the
  # issue and generates the following:
  # foo:
  #   bar: baz
  foo = {
    bar = "baz";
  };
}
```

Glance will automatically reload itself if the config file changes, which
greatly simplifies the setup. The only remaining bit we have is to automatically
generate this YAML every time we make a change to the Nix file, so that we can freely
switch between editor and web browser to see changes without taking a trip to the
terminal.

I solved this using [watchexec](https://github.com/watchexec/watchexec) and a tiny Bash script that I stuffed
into a [devshell](https://github.com/numtide/devshell) command:

```bash
out_conf=$(mktemp)
${lib.getExe pkgs.watchexec} -r -w "${glanceConf}" -- "${lib.getExe pkgs.nix-converter} --from-nix -f ${glanceConf} -l yaml > $out_conf" &
${lib.getExe pkgs.glance} -config "$out_conf"
```

This is a mix of regular Bash and Nix which will make sense to Nix users, but
for everyone else: `${lib.getExe pkgs.watchexec}` gives you a path of the form
`/nix/store/store-hash-watchexec-version/bin/watchexec` which is the binary you
can execute. `$glanceConf` is a Nix variable containing a string path to the
`glance.nix` file we pulled out earlier.

All put together it looks like
[this](https://msfjarvis.dev/g/dotfiles/e1bffa7e9d97). If I need to edit my
Glance config, I will go into the `glance` devShell, boot up
[Zed](https://zed.dev), run the `dev` command in my terminal and enjoy a fully
automated iteration experience.

## Caveats

This setup is not even remotely perfect, `nix-generator` has  bugs and discrepancies compared to the Nix to YAML implementation inside Nixpkgs. Not all constructs that work fine with Nixpkgs work that well with `nix-generator`, complicating development.
