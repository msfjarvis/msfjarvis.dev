{
  description = "The source behind msfjarvis.dev";

  inputs = {
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, devshell, flake-utils, nixpkgs, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ devshell.overlays.default ];
        };
      in {
        devShell = pkgs.devshell.mkShell {
          name = "blog-dev-shell";
          bash = { interactive = ""; };
          packages = with pkgs; [
            git
            go
            hugo
          ];
          commands = [
            {
              name = "dev";
              category = "development";
              command = "hugo server -D";
              help = "Run the Hugo development server";
            }
            {
              name = "build";
              category = "deployment";
              command = "hugo";
              help = "Build the site";
            }
          ];
        };
      });
}
