{
  description = "The source behind msfjarvis.dev";

  inputs = {
    devshell = {
      url = "github:numtide/devshell/master";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
    };
    flake-utils.url = "github:numtide/flake-utils/master";
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, devshell, flake-utils, nixpkgs, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ devshell.overlay ];
        };
      in {
        devShell = pkgs.devshell.mkShell {
          name = "blog-dev-shell";
          bash = { interactive = ""; };
          packages = with pkgs; [
            deno
            git
            go
            hugo
            imagemagick
            nodejs-16_x
            yarn
          ];
          commands = [
            {
              name = "dev";
              category = "development";
              command = "yarn exec ntl dev";
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