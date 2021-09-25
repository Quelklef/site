{ pkgs }: let

inherit (pkgs.lib.lists) forEach;

python = pkgs.python38.withPackages (ppkgs: [ ppkgs.beautifulsoup4 ]);

# Maps hostnames to Matomo website IDs
siteIdMap = {
  "maynards.site" = 3;
  "daygen.maynards.site" = 4;
  "stop-using-language.com" = 5;
  "i-need-the-nugs.com" = 6;
};

getSiteId = host:
  if builtins.hasAttr host siteIdMap
  then builtins.toString (siteIdMap.${host})
  else throw "No registered site id for host ${host}. Create a site in Matomo and add its id to the map.";

mk-matomo-js = host: let
  pretty = pkgs.writeText "matomo-js-${host}-pretty" ''
    (function() {
      var key = atob('X3BhcQ==');
      var cmds = window[key] = window[key] || [];
      var stub = "//stats.maynards.site/";

      cmds.push(["setDocumentTitle", document.domain + "/" + document.title]);
      cmds.push(["setCookieDomain", "*.maynards.site"]);
      cmds.push(['trackPageView']);
      cmds.push(['enableLinkTracking']);
      cmds.push(['setTrackerUrl', stub + 'zngbzb13.php.definitely-not']);
      cmds.push(['setSiteId', '${getSiteId host}']);

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = stub + 'zngbzb13.js.definitely-not';

      var existing = document.getElementsByTagName('script')[0];
      existing.parentNode.insertBefore(script, existing);
    })();
  '';

  ujs = pkgs.fetchFromGitHub
    { owner = "mishoo";
      repo = "UglifyJS";
      rev = "70ceda5398535c7028682e05cc8b82009953e54d";
      sha256 = "09gnmmzwzn06lshnv5vp6hai2v8ngsjn3c76rf1d7c4nzlrn2w3p";
    };

  ugly = pkgs.runCommand
    "matomo-js-${host}-ugly" {}
    ''${pkgs.nodejs}/bin/node ${ujs}/bin/uglifyjs ${pretty} -c toplevel -m -o $out'';

  in ugly;

with-matomo = host: deriv: pkgs.stdenv.mkDerivation {
  name = "matomoized";
  dontUnpack =  true;
  buildInputs = [ python ];
  installPhase = ''
    mkdir ./working
    cp -r ${deriv}/. ./working
    chmod -R +w ./working

    cat <<EOF > fixup.py
    import sys, bs4, re
    parse = lambda text: bs4.BeautifulSoup(text, features='html.parser')
    with open('${mk-matomo-js host}') as f: script_js = f.read()
    script_html = "\n<script type='text/javascript'>" + script_js + "</script>\n"
    for fname in sys.stdin.read().split('\n'):
      if not fname: continue
      with open(fname, 'r') as f: soup = parse(f.read())
      if soup.head: soup.head.append(parse(script_html))
      else: (soup.html or soup).insert(0, parse(script_html))
      with open(fname, 'w') as f: f.write(str(soup))
    EOF
    find ./working | grep -E '\.html$' || true
    { find ./working | grep -E '\.html$' || true; } | python fixup.py

    mkdir $out
    cp -r ./working/. $out
  '';
};

matomoize = elems:
  forEach elems (elem:
    if elem.type == "asset"
    then elem // { files = with-matomo elem.host elem.files; }
    else elem);

in { inherit matomoize; }