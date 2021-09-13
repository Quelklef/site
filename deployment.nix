{ pkgs ? import <nixpkgs> {} }:

let

inherit (pkgs.lib.lists) forEach filter;

inherit (import ./lib/const.nix) secrets primary-host;

elems = let
  elems-orig = import ./elems.nix { inherit pkgs; };
  with-matomo = import ./lib/with-matomo.nix { inherit pkgs; };
  result =
    forEach elems-orig (elem:
      if elem.type == "asset"
      then elem // { files = with-matomo elem.files; }
      else elem);
  in result;

elem-modules = map (m: m.module) (filter (elem: elem.type == "module") elems);

in

{
  network.description = "Maynard's site";
  network.enableRollback = true;

  site =
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
