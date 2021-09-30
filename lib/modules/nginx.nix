{ pkgs, elems }: let

inherit (pkgs.lib.attrsets) recursiveUpdate;
inherit (pkgs.lib.lists) forEach unique groupBy filter foldl';
inherit (builtins) hasAttr getAttr;
getAttrOr = attr: default: val: if hasAttr attr val then getAttr attr val else default;
fold = foldl' (a: b: a // b) {};

inherit (import ../const.nix) primary-host;

hosts =
  let has-host = filter (elem: builtins.elem elem.type ["asset" "redirect" "proxy"]) elems;
  in unique (forEach has-host (elem: elem.host));

getRedirects =
  let redirectsByHost = groupBy (redir: redir.host) (filter (elem: elem.type == "redirect") elems);
  in host: getAttrOr host [] redirectsByHost;

getProxies =
  let proxiesByHost = groupBy (proxy: proxy.host) (filter (elem: elem.type == "proxy") elems);
  in host: getAttrOr host [] proxiesByHost;

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
      { addSSL = true;
        locations."^~ /.well-known/acme-challenge/".extraConfig =
          "root /var/lib/acme/acme-challenge;";
      } //
      # ^ would prefer forceSSL, but some localStorage-using apps were used over http
      (if host == primary-host
      then { enableACME = true; }
      else { useACMEHost = primary-host; });

    redirects = fold
       (forEach (getRedirects host) (redirect:
         let code = { permanent = 301; temporary = 302; }.${redirect.permanence};
         in { locations."= ${redirect.from}".extraConfig = "return ${toString code} ${redirect.to};"; }));

    proxies = fold
      (forEach (getProxies host) (proxy-elem:
        { locations."~ ${proxy-elem.path}".extraConfig = ''
            rewrite ${proxy-elem.path}/(.*) /$1 break;
              # ^ so HOST/STUB/path sends /path to the server, not /STUB/path
            proxy_pass ${proxy-elem.target};
          '';
        }));

   in
    { ${host} =
            recursiveUpdate init
          ( recursiveUpdate ssl
          ( recursiveUpdate redirects
          ( recursiveUpdate proxies
          ( {} )))); };

in {
  services.nginx = {
    enable = true;

    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;

    virtualHosts = fold (map mk-vhost hosts);
  };

  security.acme.certs.${primary-host}.extraDomainNames = hosts;
}
