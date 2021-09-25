{ pkgs }: let

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

in host: deriv: pkgs.stdenv.mkDerivation {
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
    script = """
      <script type="text/javascript">
        {
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
        }
      </script>
    """
    for fname in sys.stdin.read().split('\n'):
      if not fname: continue
      with open(fname, 'r') as f: soup = parse(f.read())
      if soup.head: soup.head.append(parse(script))
      else: (soup.html or soup).insert(0, parse(script))
      with open(fname, 'w') as f: f.write(str(soup))
    EOF
    find ./working | grep -E '\.html$' || true
    { find ./working | grep -E '\.html$' || true; } | python fixup.py

    mkdir $out
    cp -r ./working/. $out
  '';
}
