{ pkgs ? import <nixpkgs> {}
, do-analytics ? false
}:

let

build = import ./lib/build.nix { inherit pkgs; };
elems = let
  elems-orig = import ./elems.nix { inherit pkgs do-analytics; };
  inherit (import ./lib/matomo.nix { inherit pkgs do-analytics; }) matomoize-assets;
  in matomoize-assets elems-orig;

in
  build elems
