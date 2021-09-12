{ pkgs ? import <nixpkgs> {} }:

let

inherit (pkgs.lib.strings) concatMapStringsSep;

elems-nix = import ./elems.nix { inherit pkgs; };
inherit (elems-nix) elems filterType;
assets = filterType "asset" elems;

assetBuildCommand = asset: ''
  mkdir -p $out/${asset.host}/${asset.path}
  cp -r ${asset.files}/. $out/${asset.host}/${asset.path}
'';

in

pkgs.runCommand
  "maynards-site" {}
  ''
    set -euo pipefail
    ${concatMapStringsSep "\n\n" assetBuildCommand assets}
  ''
