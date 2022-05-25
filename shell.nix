{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    git
    go
    hugo
    imagemagick
    nodejs-16_x
    wrangler
    yarn
  ];
}
