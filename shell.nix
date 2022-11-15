{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    deno
    git
    go
    hugo
    imagemagick
    nodejs-16_x
    yarn
  ];
}
