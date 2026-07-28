{
  description = "The source behind msfjarvis.dev";

  inputs.nixpkgs.url = "github:msfjarvis/nixpkgs/nixpkgs-unstable";

  inputs.systems.url = "github:msfjarvis/flake-systems";

  inputs.devshell.url = "github:numtide/devshell";
  inputs.devshell.inputs.nixpkgs.follows = "nixpkgs";

  inputs.flake-compat.url = "git+https://git.lix.systems/lix-project/flake-compat";
  inputs.flake-compat.flake = false;

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.flake-utils.inputs.systems.follows = "systems";

  inputs.treefmt-nix.url = "github:numtide/treefmt-nix";
  inputs.treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";

  outputs =
    {
      devshell,
      flake-utils,
      nixpkgs,
      treefmt-nix,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ devshell.overlays.default ];
        };
      in
      {
        formatter =
          let
            treefmtEval = treefmt-nix.lib.evalModule pkgs {
              projectRootFile = "flake.nix";
              package = pkgs.treefmt;

              programs = {
                actionlint.enable = true;
                biome = {
                  enable = true;
                  settings.formatter.indentStyle = "space";
                };
                deadnix.enable = true;
                nixfmt = {
                  enable = true;
                  package = pkgs.nixfmt;
                };
                statix.enable = true;
                taplo.enable = true;
                yamlfmt.enable = true;
              };
            };
          in
          treefmtEval.config.build.wrapper;
        devShell = pkgs.devshell.mkShell {
          name = "blog-dev-shell";
          bash = {
            interactive = "";
          };
          packages = with pkgs; [
            git
            go
            hyperlink
            libwebp
            nodejs_latest
            pagefind
          ];
          commands = [
            {
              name = "conv";
              category = "development";
              command = ''
                DIR=src/content
                for fmt in png jpg jpeg; do
                  fd -tf "''${fmt}$" "$DIR" -x cwebp -q 82 -m 6 -sharp_yuv -mt {} -o '{.}.webp'
                  fd -tf "''${fmt}$" "$DIR" -X rm -v
                done
              '';
              help = "Convert all PNGs to WebP";
            }
#             {
#               name = "diffs";
#               category = "development";
#               command = ''
#                 set -x
#                 OLD_DIR=$(mktemp -d)
#                 NEW_DIR=$(mktemp -d)
# 
#                 # Build the current working directory
#                 build
# 
#                 # Relocate the outputs to `$NEW_DIR`
#                 cp -rT dist/ $NEW_DIR/
#                 git stash
# 
#                 # Stash any changes
#                 git stash || true
# 
#                 # Checkout the remote main branch for baseline
#                 git checkout origin/main
# 
#                 # Build the baseline
#                 build
# 
#                 # Relocate site to `$OLD_DIR`
#                 cp -rT dist/ $OLD_DIR/
# 
#                 # Revert to the default branch
#                 git checkout main
# 
#                 # Pop any potentially stashed changes
#                 git stash pop || true
# 
#                 # Launch meld with the `$OLD_DIR` and `$NEW_DIR` directories to diff them
#                 ${pkgs.lib.getExe pkgs.meld} $OLD_DIR $NEW_DIR
# 
#                 # Clean up the temporary folders when `meld` exits
#                 rm -rf $OLD_DIR $NEW_DIR
#               '';
#               help = "Launch meld to diff between the `old` and `new` folders";
#             }
          ];
          env = [
            {
              name = "DEVSHELL_NO_MOTD";
              value = 1;
            }
          ];
        };
      }
    );
}
