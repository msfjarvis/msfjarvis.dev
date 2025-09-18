{ pkgs, ... }:
{
  projectRootFile = "flake.nix";
  package = pkgs.treefmt;

  programs.actionlint = {
    enable = true;
  };
  programs.biome = {
    enable = true;
  };
  programs.deadnix = {
    enable = true;
  };
  programs.mdformat = {
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

  settings.formatter.markdown-code-runner = {
    command = pkgs.lib.getExe pkgs.markdown-code-runner;
    options =
      let
        config = pkgs.writers.writeTOML "markdown-code-runner-config" {
          presets.nixfmt = {
            language = "nix";
            command = [ (pkgs.lib.getExe pkgs.nixfmt) ];
          };
          presets.ktfmt = {
            language = "kotlin";
            command = [ "${pkgs.lib.getExe pkgs.ktfmt} - {file}" ];
          };
        };
      in
      [ "--config=${config}" ];
    includes = [ "*.md" ];
  };
}
