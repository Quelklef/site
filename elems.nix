{ pkgs }:

let

# TODO: an actual HTTP redirect would be better
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

# make a site element from a files-producing derivation
mkAsset = host: path: deriv:
  { type = "asset";
    inherit host path;
    files = deriv;
  };

# make a site element from a nixos module
mkModule = modl:
  { type = "module";
    module = modl;
  };

filterType = type: pkgs.lib.lists.filter (elem: elem.type == type);

export = { inherit filterType elems; };


elems = [

  (mkAsset "daygen.maynards.site" "" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/daygen";
        rev = "ab67ce2643d2f442cf97e0a6759cf17ff47aeed8";
      };
    in import src { inherit pkgs; }))

  (mkAsset "stop-using-language.com" ""
    (pkgs.writeTextDir "index.html" (builtins.readFile ./src/stop-using-language.html)))

  (mkAsset "maynards.site" "" (
    (redirect-to "/legacy-index" /* for now */)))

  (mkAsset "maynards.site" "fitch" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; }))

  (mkAsset "maynards.site" "ellipses"
    (pkgs.writeTextDir "index.html" (builtins.readFile ./src/ellipses.html)))

  (mkAsset "maynards.site" "prime-spirals"
    (pkgs.writeTextDir "index.html" (builtins.readFile ./src/prime-spirals.html)))

  (mkAsset "maynards.site" "files" (
    pkgs.stdenv.mkDerivation {
      name = "files";
      src = ./src/files;
      installPhase = "mkdir $out && cp -r $src/. $out";
    }))

  (mkModule (
    let src = builtins.fetchGit
          { url = "https://github.com/quelklef/g-word-bot";
            rev = "b574c7e7a7ed0c67be6d96dc63608aa6109a5f7a";
          };
        token = (import ./secrets.nix).g-word-bot-token;
    in import (src + "/module.nix") { inherit pkgs token; }))

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

  (mkAsset "maynards.site" "assets"
    (fixup-index-link (pkgs.runCommand "legacy-assets" {} "cp -r ${legacy}/assets/. $out")))

  (mkAsset "maynards.site" "items"
    (fixup-index-link (pkgs.runCommand "legacy-items" {} "cp -r ${legacy}/items/. $out")))

  (mkAsset "maynards.site" "items/fitch-new" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; }))

  (mkAsset "maynards.site" "legacy-index"
    (fixup-index-link (pkgs.runCommand "legacy-index" {} "mkdir $out && cp ${legacy}/index.html $out")))

]);

in export
