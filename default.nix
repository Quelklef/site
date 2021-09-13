{ pkgs ? import <nixpkgs> {} }:

let

build = import ./lib/build.nix { inherit pkgs; };
elems = import ./elems.nix { inherit pkgs; };

in
  build elems
