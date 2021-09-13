{ pkgs }: let

inherit (pkgs.lib.strings) concatMapStringsSep;
inherit (pkgs.lib.lists) filter;

in elems: let

  assets = filter (elem: elem.type == "asset") elems;

  assetBuildCommand = asset: ''
    mkdir -p $out/${asset.host}/${asset.path}
    cp -r ${asset.files}/. $out/${asset.host}/${asset.path}
  '';

  in pkgs.runCommand
    "maynards-site" {}
    ''
      set -euo pipefail
      ${concatMapStringsSep "\n\n" assetBuildCommand assets}
    ''
