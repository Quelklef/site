{ pkgs ? import <nixpkgs> {} }:

let

inherit (pkgs.lib.strings) concatMapStringsSep;

pages = import ./pages.nix { inherit pkgs; };

pageBuildCommand = page: ''
  mkdir -p $out/${page.host}/${page.path}
  cp -r ${page.deriv}/. $out/${page.host}/${page.path}
'';

in

pkgs.runCommand
  "maynards-site" {}
  ''
    set -euo pipefail
    ${concatMapStringsSep "\n\n" pageBuildCommand pages}
  ''
