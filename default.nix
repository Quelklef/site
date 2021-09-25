{ pkgs ? import <nixpkgs> {}
, do-matomo ? false
}:

let

build = import ./lib/build.nix { inherit pkgs; };
elems = let
  elems-orig = import ./elems.nix { inherit pkgs; };
  inherit (import ./lib/matomo.nix { inherit pkgs; }) matomoize;
  in
    if do-matomo then matomoize elems-orig else elems-orig;

in
  build elems
