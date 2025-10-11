{ pkgs, ... }:
{
  projectRootFile = "flake.nix";
  package = pkgs.treefmt;

  programs.actionlint = {
    enable = true;
  };
  programs.biome = {
    enable = true;
    settings = {
      formatter = {
        indentStyle = "space";
      };
    };
  };
  programs.deadnix = {
    enable = true;
  };
  programs.nixfmt = {
    enable = true;
    package = pkgs.nixfmt;
  };
  programs.statix = {
    enable = true;
  };
  programs.taplo = {
    enable = true;
  };
  programs.yamlfmt = {
    enable = true;
  };
}
