{ pkgs ? import <nixpkgs> {} }:

let

inherit (pkgs.lib.lists) forEach unique groupBy;
inherit (builtins) hasAttr getAttr;
getAttrOr = attr: default: val: if hasAttr attr val then getAttr attr val else default;

default-nix = import ./default.nix { inherit pkgs; };
elems-nix = import ./elems.nix { inherit pkgs; };

in

{
  network.description = "Maynard's site";
  network.enableRollback = true;

  site =
  { modulesPath, config, pkgs, ... }:
  {
    deployment.targetHost = "159.65.221.108";

    imports =
      let modules = map (m: m.module) (elems-nix.filterType "module" elems-nix.elems);
      in [ (modulesPath + "/virtualisation/digital-ocean-config.nix") ]
         ++ modules;

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
          inherit (elems-nix) elems filterType;
          assets = filterType "asset" elems;
          hosts = unique (forEach assets (asset: asset.host));
        in
          builtins.foldl' (a: b: a // b) {}
            (forEach hosts (host:
              {
                ${host} = {
                  root = "${default-nix}/${host}";
                  default = host == "maynards.site";

                  # TODO: SSL (not working :C)
                  # addSSL = true;
                  # # ^ Would prefer forceSSL, but can't. Have served some apps
                  # #   over HTTP that use localStorage; localStorage state is not
                  # #   shared between respective HTTP and HTTPS URLs.
                  # enableACME = host == "maynards.site";
                  # useACMEHost = if host == "maynards.site" then null else "maynards.site";
                }

                # set up redirects
                // (
                  let redirectsByHost = groupBy (redir: redir.host) (filterType "redirect" elems);
                      getRedirects = host: getAttrOr host [] redirectsByHost;
                  in builtins.foldl' (a: b: a // b) {}
                       (forEach (getRedirects host) (redirect:
                         let code = { permanent = 301; temporary = 302; }.${redirect.permanence};
                         in { locations."= ${redirect.from}".extraConfig = "return ${toString code} ${redirect.to};"; }))
                );
              }
            ));
    };

    # for letsencrypt
    security.acme = {
      email = "eli.t.maynard+site-acme@gmail.com";
      acceptTerms = true;
    };
  };
}
