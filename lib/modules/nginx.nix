{ pkgs, elems }: let

inherit (pkgs.lib.lists) forEach unique groupBy filter foldl';
inherit (builtins) hasAttr getAttr;
getAttrOr = attr: default: val: if hasAttr attr val then getAttr attr val else default;
fold = foldl' (a: b: a // b) {};

inherit (import ../const.nix) primary-host;

hosts =
  let assets = filter (elem: elem.type == "asset") elems;
  in unique (forEach assets (asset: asset.host));

getRedirects =
  let redirectsByHost = groupBy (redir: redir.host) (filter (elem: elem.type == "redirect") elems);
  in host: getAttrOr host [] redirectsByHost;

mk-vhost = host:
  let
    init = {
      root =
        let build = import ../build.nix { inherit pkgs; };
            built = build elems;
        in "${built}/${host}";
      default = host == primary-host;
    };

    ssl =
      { addSSL = true; } //
      # ^ would prefer forceSSL, but some localStorage-using apps were used over http
      (if host == primary-host
      then { enableACME = true;
             locations."^~ /.well-known/acme-challenge/".extraConfig =
               "root /var/lib/acme/acme-challenge/.well-known/acme-challenge;";
           }
      else { useACMEHost = primary-host; });

    redirects = fold
       (forEach (getRedirects host) (redirect:
         let code = { permanent = 301; temporary = 302; }.${redirect.permanence};
         in { locations."= ${redirect.from}".extraConfig = "return ${toString code} ${redirect.to};"; }));

   in
    { ${host} = init // ssl // redirects; };

in {
  services.nginx = {
    enable = true;

    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;

    virtualHosts = fold (map mk-vhost hosts);
  };
}
