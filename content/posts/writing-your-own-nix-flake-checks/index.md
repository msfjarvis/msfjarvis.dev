+++
categories = ["nix"]
date = 2022-12-18
lastmod = 2024-06-04
summary = "Quick how-to for writing ad-hoc checks for your own Nix Flakes"
slug = "writing-your-own-nix-flake-checks"
tags = ["nix", "nix flakes", "flake checks"]
title = "Writing your own Nix Flake checks"
+++

## Preface

Ever since discovering [nix(3) flake check](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake-check.html) from [crane](https://github.com/ipetkov/crane) (wonderful tool btw, highly recommend it if you're building Rust things), I've wanted to be able to quickly write my own flake checks. Unfortunately, as with everything Nix, dummy-friendly documentation was hard to come by so I started trying out a bunch of things until I ended up with something that worked, which I'll share below.

## The premise

I had been using a basic shell script with a `nix-shell` shebang for a while to run formatters on my scripts repo and while it worked, `nix-shell` startup is fairly slow and it just wasn't cutting it for me. So I decided to try porting it to `nix flake check` which would benefit from evaluation caching and be faster while removing the overhead of `nix-shell` from the utility script.

## The thing you're here for

Like everything in Nix, the checks needed to be derivations that Nix will build and run the respective `checkPhase` of. So naively, I put together this to run the [alejandra](https://github.com/kamadorueda/alejandra) Nix formatter, [shfmt](https://github.com/mvdan/sh) to format shell scripts and [shellcheck](https://shellcheck.net/) to lint them:

```nix
outputs = {
  self,
  nixpkgs,
  flake-utils,
}:
  flake-utils.lib.eachDefaultSystem (system: let
    pkgs = import nixpkgs {inherit system;};
    files = pkgs.lib.concatStringsSep " " [
      # Individual shell scripts from the repository
    ];
    fmt-check = pkgs.stdenv.mkDerivation {
      name = "fmt-check";
      src = ./.;
      doCheck = true;
      nativeBuildInputs = with pkgs; [alejandra shellcheck shfmt];
      checkPhase = ''
        shfmt -d -s -i 2 -ci ${files}
        alejandra -c .
        shellcheck -x ${files}
      '';
    };
  in {
    checks = {inherit fmt-check;};
  });
```

I needed a space separated list of my shell scripts to pass to shfmt and shellcheck, so I used a library function from nixpkgs called `concatStringsSep` that takes a list, and concatenates it together with the given separator. That's the `files` binding declared in the snippet above.

Here I ran into my first problem: Nix expects every derivation to generate an output which meant this doesn't actually build.

```plaintext
➜ nix flake check
error: flake attribute 'checks.fmt-check.outPath' is not a derivation
```

There's been [some discussion](https://github.com/NixOS/nixpkgs/issues/16182) about this but the TL;DR is that `mkDerivation` must produce an output. So I tried to cheat around this requirement by faking an output.

```diff
diff --git flake.nix flake.nix
index b7fef3b99110..a531a30ad88e 100644
--- flake.nix
+++ flake.nix
@@ -18,6 +18,7 @@
       ];
       fmt-check = pkgs.stdenv.mkDerivation {
         name = "fmt-check";
+        dontBuild = true;
         src = ./.;
         doCheck = true;
         nativeBuildInputs = with pkgs; [alejandra shellcheck shfmt];
         checkPhase = ''
@@ -25,6 +26,11 @@
           alejandra -c .
           shellcheck -x ${files}
         '';
+        installPhase = ''
+          mkdir "$out"
+        '';
       };
     in {
       checks = {inherit fmt-check;};
```

`dontBuild` does exactly what you'd think and makes Nix not execute the `buildPhase` of the derivation, and the `mkdir $out` in the `installPhase` generates the output directory Nix was looking for which is still valid even if completely empty.

You can make this slightly faster by using a smaller stdenv that won't pull in a compiler toolchain or be rebuilt when said toolchain is updated:

```diff
diff --git flake.nix flake.nix
index 7ce7a2ba80f8..b69db13fbc6d 100644
--- flake.nix
+++ flake.nix
@@ -16,7 +16,7 @@
       files = pkgs.lib.concatStringsSep " " [
         # bunch of shell scripts since I didn't have an extension I could glob against
       ];
-      fmt-check = pkgs.stdenv.mkDerivation {
+      fmt-check = pkgs.stdenvNoCC.mkDerivation {
         name = "fmt-check";
         dontBuild = true;
         src = ./.;
```

## The final result

This is what the flake looked like for me after all this

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils/main";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      files = pkgs.lib.concatStringsSep " " [
        # Individual shell scripts from the repository
      ];
      fmt-check = pkgs.stdenvNoCC.mkDerivation {
        name = "fmt-check";
        dontBuild = true;
        src = ./.;
        doCheck = true;
        nativeBuildInputs = with pkgs; [alejandra shellcheck shfmt];
        checkPhase = ''
          shfmt -d -s -i 2 -ci ${files}
          alejandra -c .
          shellcheck -x ${files}
        '';
        installPhase = ''
          mkdir "$out"
        '';
      };
    in {
      checks = {inherit fmt-check;};
    });
}
```

It's probably not idiomatic Nix (for some definition of idiomatic) but the entire thing has been a trial and error anyway so :shrug:

I'm very much a noob when it comes to Nix so any feedback is very welcome and appreciated!

### Alternative solution (June 2024 update)

The above 'hack' can also be changed to use [pkgs.runCommand](https://nixos.org/manual/nixpkgs/stable/#trivial-builder-runCommand) which I recently learned about.

```nix
{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils/main";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      files = pkgs.lib.concatStringsSep " " [
        # Individual shell scripts from the repository
      ];
      # Variant of runCommand intended for commands
      # that run quickly and will be slowed down by
      # the network round-trip.
      fmt-check = pkgs.runCommandLocal "fmt-check" {
        src = ./.;
        nativeBuildInputs = with pkgs; [alejandra shellcheck shfmt];
      } ''
          shfmt -d -s -i 2 -ci ${files}
          alejandra -c .
          shellcheck -x ${files}
          mkdir "$out"
        '';
    in {
      checks = {inherit fmt-check;};
    });
}
```
