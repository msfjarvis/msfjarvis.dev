{
  description = "The source behind msfjarvis.dev";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  inputs.systems.url = "github:msfjarvis/flake-systems";

  inputs.devshell.url = "github:numtide/devshell";
  inputs.devshell.inputs.nixpkgs.follows = "nixpkgs";

  inputs.flake-compat.url = "github:nix-community/flake-compat";
  inputs.flake-compat.flake = false;

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.flake-utils.inputs.systems.follows = "systems";

  outputs = {
    self,
    devshell,
    flake-utils,
    nixpkgs,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [devshell.overlays.default];
      };
    in {
      devShell = pkgs.devshell.mkShell {
        name = "blog-dev-shell";
        bash = {interactive = "";};
        packages = with pkgs; [
          dprint
          git
          go
          hugo
          hyperlink
          libwebp
        ];
        commands = [
          {
            name = "build";
            category = "deployment";
            command = "hugo";
            help = "Build the site";
          }
          {
            name = "dev";
            category = "development";
            command = "hugo server -D";
            help = "Run the Hugo development server";
          }
          {
            name = "format";
            category = "development";
            command = "dprint fmt";
            help = "Format this repository";
          }
        ];
        env = [
          {
            name = "DEVSHELL_NO_MOTD";
            value = 1;
          }
        ];
      };
    });
}
