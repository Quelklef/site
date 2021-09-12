{ pkgs }:

let

redirect-to = target:
  pkgs.writeTextDir "index.html" ''
    <html>
      <head>
        <title>Redirect to ${target}</title>
      </head>
      </body>
        <p>We are trying to redirect you to ${target}, but it doesn't seem to be working.</p>
        <p>Please click on this link: <a href="${target}">${target}</a></p>
        <script> window.location.href = "${target}"; </script>
      </body>
    </html>
  '';

pages = [

{
  host = "daygen.maynards.site";
  path = "";
  deriv =
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/daygen";
        rev = "ab67ce2643d2f442cf97e0a6759cf17ff47aeed8";
      };
    in import src { inherit pkgs; };
}

{
  host = "stop-using-language.com";
  path = "";
  deriv = pkgs.writeTextDir "index.html" (builtins.readFile ./src/stop-using-language.html);
}

{
  host = "nixed.maynards.site";
  path = "";
  deriv = redirect-to "/legacy-index";  # for now
}

{
  host = "nixed.maynards.site";
  path = "fitch";
  deriv =
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; };
}

{
  host = "nixed.maynards.site";
  path = "ellipses";
  deriv = pkgs.writeTextDir "index.html" (builtins.readFile ./src/ellipses.html);
}

{
  host = "nixed.maynards.site";
  path = "prime-spirals";
  deriv = pkgs.writeTextDir "index.html" (builtins.readFile ./src/prime-spirals.html);
}

{
  host = "nixed.maynards.site";
  path = "files";
  deriv =
    pkgs.stdenv.mkDerivation {
      name = "files";
      src = ./src/files;
      installPhase = "mkdir $out && cp -r $src/. $out";
    };
}

] ++ (
# -- legacy stuff -- #

let

legacy = import ./src/legacy { inherit pkgs; };

fixup-index-link = deriv: pkgs.stdenv.mkDerivation {
  name = "no-fucky-index";
  dontUnpack =  true;
  buildInputs = [ (pkgs.python38.withPackages (ppkgs: [ ppkgs.beautifulsoup4 ])) ];
  installPhase = ''
    mkdir ./working
    cp -r ${deriv}/. ./working
    chmod -R +w ./working

    cat <<EOF > fixup.py
    import sys, bs4, re
    parse = lambda text: bs4.BeautifulSoup(text, features='html.parser')
    for fname in sys.stdin.read().split('\n'):
      if not fname: continue
      print("Fixing up", fname)
      with open(fname, 'r') as f: soup = parse(f.read())
      links = soup.findAll('a', { 'href': re.compile(r"^\.*/\.*$") })
      for item in links: item.attrs['href'] = '/legacy-index/'
      soup.head.append(parse('<meta http-equiv="content-type" content="text/html; charset=UTF-8">'))
      with open(fname, 'w') as f: f.write(str(soup))
      # ^ don't use .prettify(); it causes a javascript bug (lol)
    EOF


    { find ./working | grep -E '\.html$' || true; } | python fixup.py

    mkdir $out
    cp -r ./working/. $out
  '';
};

in

[

{
  host = "nixed.maynards.site";
  path = "assets";
  deriv = fixup-index-link (pkgs.runCommand "legacy-assets" {} "cp -r ${legacy}/assets/. $out");
}

{
  host = "nixed.maynards.site";
  path = "items";
  deriv = fixup-index-link (pkgs.runCommand "legacy-items" {} "cp -r ${legacy}/items/. $out");
}

{
  host = "nixed.maynards.site";
  path = "legacy-index";
  deriv = fixup-index-link (pkgs.runCommand "legacy-index" {} "mkdir $out && cp ${legacy}/index.html $out");
}

]);

in pages
