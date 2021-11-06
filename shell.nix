{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    go
    hugo
    imagemagick
    nodejs-16_x
    wrangler
  ];
}
