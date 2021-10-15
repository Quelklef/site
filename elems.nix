{ pkgs, do-analytics }:

let

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

# make a site element from a redirect
mkRedirect = { permanence, host, from, to }:
  { type = "redirect";
    inherit permanence host from to;
  };

# make a site element from a proxy_pass
mkProxy = { host, path, target }:
  { type = "proxy";
    inherit host path target;
  };


# turn a local path into a derviation
trivial = name: path:
  pkgs.stdenv.mkDerivation {
    inherit name;
    dontUnpack = true;
    installPhase = ''
      if [ -d ${path} ]; then
        mkdir $out
        cp -r ${path}/. $out
      elif [ -f ${path} ]; then
        mkdir $out
        cp ${path} $out/${name}
      else
        echo >2 "wtf"
        exit 1
      fi
    '';
  };


secrets = import /home/lark/me/keep/secrets/website-secrets.nix;


elems = [

  # -- Daygen -- #

  (mkAsset "daygen.maynards.site" "" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/daygen";
        rev = "ab67ce2643d2f442cf97e0a6759cf17ff47aeed8";
      };
    in import src { inherit pkgs; }))

  # -- Stop using language -- #

  (mkAsset "stop-using-language.com" ""
    (trivial "index.html" ./src/stop-using-language.html))

  # -- maynards.site -- #

  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/";
      to = "/legacy-index";
    }) # for now

  (mkAsset "maynards.site" "fitch" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; }))

  (mkAsset "maynards.site" "ellipses"
    (trivial "index.html" ./src/ellipses.html))

  (mkAsset "maynards.site" "prime-spirals" (
    builtins.fetchGit
      { url = "https://github.com/quelklef/prime-spirals";
        rev = "a4126c1c9f73c38c69dd111a6f224446692c6b23";
      }))

  (mkAsset "maynards.site" "cascading-contexts"
    (trivial "cascading-contexts" ./src/cascading-contexts))

  (mkAsset "maynards.site" "files"
    (trivial "files" ./src/files))

  (mkModule (
    let src = builtins.fetchGit
          { url = "https://github.com/quelklef/g-word-bot";
            rev = "702035d815d6bf331363b7a85c050888733b4aba";
          };
        token = secrets.g-word-bot-token;
    in import (src + "/module.nix") { inherit pkgs token; }))

  (mkModule (
    let useLocal = false;
        src = if useLocal then ../mathsproofbot
              else builtins.fetchGit
                { url = "https://github.com/quelklef/mathsproofbot";
                  rev = "6b12fbcebab152251c4a6955722ae765f2617fb4";
                };
        auth = secrets.mathsproofbot-auth;
    in import (src + "/nix/module.nix") { inherit pkgs auth; }))

  # -- Nugs -- #

  (mkAsset "i-need-the-nugs.com" ""
    (trivial "nugs" ./src/nugs))

  # -- UMN Ducks -- #

  (mkProxy
    { host = "umn-ducks.com";
      path = "/";
      target = "http://127.0.0.1:8475";
    })

  (mkModule (
    let useLocal = true;
    in import ./src/umn-ducks.nix
      { inherit pkgs useLocal;
        port = 8475;
        # v TODO: the whole matomo situation needs to be sorted out
        #         currently we are handling static assets automagically via nginx,
        #         but then since umn-ducks.com is served dynamically via reverse
        #         proxy, we need to do it this way instead
        html-inject = let inherit (import ./lib/matomo.nix { inherit pkgs do-analytics; }) mk-matomo-inject;
                      in mk-matomo-inject { host = "umn-ducks.com"; };
      }))

] ++ (

  # -- maynards.site (legacy) -- #

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

      # replace links to '/' with links to '/legacy-index'
      cat <<EOF > fixup.py
      import sys, bs4, re
      parse = lambda text: bs4.BeautifulSoup(text, features='html.parser')
      for fname in sys.stdin.read().split('\n'):
        if not fname: continue
        print("Fixing up", fname)
        with open(fname, 'r') as f: soup = parse(f.read())
        links = soup.findAll('a', { 'href': re.compile(r"^\.*/\.*$") })
        for item in links: item.attrs['href'] = '/legacy-index'
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
    (fixup-index-link (trivial "legacy-assets" "${legacy}/assets")))

  (mkAsset "maynards.site" "items"
    (fixup-index-link (trivial "legacy-items" "${legacy}/items")))

  (mkAsset "maynards.site" "items/fitch-new" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; }))

  (mkAsset "maynards.site" "legacy-index"
    (fixup-index-link (trivial "index.html" "${legacy}/index.html")))

]);

in elems
