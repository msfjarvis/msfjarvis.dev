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
            treefmtEval = treefmt-nix.lib.evalModule pkgs ./treefmt.nix;
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
              name = "conv";
              category = "development";
              command = ''
                DIR=content/posts
                fd -tf png$ "$DIR" -x cwebp -lossless -mt {} -o '{.}.webp'
                fd -tf png$ "$DIR" -X rm -v
              '';
              help = "Convert all PNGs to WebP";
            }
            {
              name = "dev";
              category = "development";
              command = "hugo server -D";
              help = "Run the Hugo development server";
            }
            {
              name = "diffs";
              category = "development";
              command = ''
                set -x
                OLD_DIR=$(mktemp -d)
                NEW_DIR=$(mktemp -d)

                # Build the current working directory
                build

                # Relocate the outputs to `$NEW_DIR`
                cp -rT public/ $NEW_DIR/
                git stash

                # Stash any changes
                git stash || true

                # Checkout the remote main branch for baseline
                git checkout origin/main

                # Build the baseline
                build

                # Relocate site to `$OLD_DIR`
                cp -rT public/ $OLD_DIR/

                # Revert to the default branch
                git checkout main

                # Pop any potentially stashed changes
                git stash pop || true

                # Launch meld with the `$OLD_DIR` and `$NEW_DIR` directories to diff them
                ${pkgs.lib.getExe pkgs.meld} $OLD_DIR $NEW_DIR

                # Clean up the temporary folders when `meld` exits
                rm -rf $OLD_DIR $NEW_DIR
              '';
              help = "Launch meld to diff between the `old` and `new` folders";
            }
            {
              name = "new";
              category = "development";
              command = ''
                set -euo pipefail

                function create_post() {
                  local title postslug postdate
                  if [ $# -lt 1 ]; then
                    echo -e "\033[01;31mProviding a title is a must!\033[0m"
                    return
                  else
                    title="''${*}"
                  fi
                  postdate="$(date +"%Y-%m-%dT%H:%M:%S%:z")"
                  postslug="$(echo "$title" | tr -dc '[:alnum:][:space:]\n\r' | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
                  [ -z "$postslug" ] && {
                    echo -e "\033[01;31mProviding a title is a must!\033[0m"
                    return
                  }
                  mkdir -p content/posts/"$postslug"
                  printf "+++\ncategories = []\ndate = %s\nlastmod = %s\nsummary = \"\"\ndraft = true\nslug = \"%s\"\ntags = []\ntitle = \"%s\"\n+++\n" \
                    "$postdate" "$postdate" "$postslug" "$title" >content/posts/"$postslug"/index.md
                  echo "content/posts/$postslug created!"
                }

                create_post "''${@}"
              '';
              help = "Create new post";
            }
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
