{ do-analytics ? true
}:

let

pkgs = import ./pkgs.nix;

inherit (pkgs.lib.lists) filter;

inherit (import ./lib/const.nix) secrets primary-host;

elems = let
  elems-orig = import ./elems.nix { inherit pkgs do-analytics; };
  lib-matomo = import ./lib/matomo.nix { inherit pkgs do-analytics; };
  in lib-matomo.matomoize-assets elems-orig;

elem-modules = map (m: m.module) (filter (elem: elem.type == "module") elems);

in

{
  network.description = "Maynard's site";
  network.enableRollback = true;

  frigate =
  { modulesPath, config, pkgs, ... }:
  {
    deployment.targetHost = "159.65.221.108";

    imports =
      [ (modulesPath + "/virtualisation/digital-ocean-config.nix")
        (import ./lib/modules/ssl-base.nix { inherit pkgs; })
        (import ./lib/modules/nginx.nix { inherit pkgs elems; })
        (import ./lib/modules/analytics.nix { inherit pkgs; })
      ]
      ++ elem-modules;

    networking.firewall.allowedTCPPorts = [
      22  # ssh
      80  # http
      8080  # http
      443  # https
      8081  # websocket
    ];
  };
}
