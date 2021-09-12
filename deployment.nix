{ pkgs ? import <nixpkgs> {} }:

let

inherit (builtins) attrNames readDir;
inherit (pkgs.lib.lists) forEach unique;
inherit (pkgs.lib.attrsets) mapAttrsToList;

pages-nix = import ./pages.nix { inherit pkgs; };

in

{
  network.description = "Maynard's site";
  network.enableRollback = true;

  site =
  { modulesPath, config, pkgs, ... }:
  {
    deployment.targetHost = "159.65.221.108";

    imports = [ (modulesPath + "/virtualisation/digital-ocean-config.nix") ];

    networking.firewall.allowedTCPPorts = [
      22  # ssh
      80  # http
      8080  # http
      443  # https
      8081  # websocket
    ];

    services.nginx = {
      enable = true;

      recommendedGzipSettings = true;
      recommendedOptimisation = true;
      recommendedProxySettings = true;
      recommendedTlsSettings = true;

      virtualHosts =
        let
          pages = import ./pages.nix { inherit pkgs; };
          hosts = unique (forEach pages (page: page.host));
        in
          builtins.foldl' (a: b: a // b) {}
            (forEach hosts (host:
              { ${host} = {
                  addSSL = true;
                  # ^ Would prefer forceSSL, but can't. Have served some apps
                  #   over HTTP that use localStorage; localStorage state is not
                  #   shared between respective HTTP and HTTPS URLs.
                  enableACME = true;
                  root = "${import ./default.nix { inherit pkgs; }}/${host}";
                  default = host == "maynards.site";
              }; }
            ));
    };


    # for letsencrypt
    security.acme = {
      email = "eli.t.maynard+site-acme@gmail.com";
      acceptTerms = true;
    };
  };
}
