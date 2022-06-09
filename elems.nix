{ pkgs, do-analytics }:

let

# make a site element from a files-producing derivation
mkAsset = host: path: deriv:
  { type = "asset";
    inherit host path;
    files = deriv;
    dontMatomo = false;
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


secrets = import <secrets>;


elems = [

  # -- maynards.site -- #

  (mkAsset "daygen.maynards.site" "" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/daygen";
        rev = "bb2c4490ac53fb0b611143845904276f72b47bd2";
      };
    in import src { inherit pkgs; }))

  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/";
      to = "/legacy-index";
    }) # for now

  (mkAsset "maynards.site" "ellipses"
    (trivial "index.html" ./src/ellipses.html))

  (mkAsset "maynards.site" "prime-spirals" (
    builtins.fetchGit
      { url = "https://github.com/quelklef/prime-spirals";
        rev = "a4126c1c9f73c38c69dd111a6f224446692c6b23";
      }))

  (mkAsset "maynards.site" "cascading-contexts"
    (trivial "cascading-contexts" ./src/cascading-contexts))

  (mkAsset "maynards.site" "pokepref"
    (trivial "pokepref" (
      let src = builtins.fetchGit {
          url = "https://github.com/Quelklef/pokepref";
          rev = "c81c30db398eedfacceb70981d615b2df537fb8a";
        };
      in src)))

  (mkAsset "maynards.site" "files"
    (trivial "files" ./src/files))

] ++ (
  let resume = import ./src/resume { inherit pkgs; };
  in [
    (mkAsset "maynards.site" "" (trivial "resume.html" "${resume}/resume.html"))
    (mkAsset "maynards.site" "" (trivial "resume.pdf" "${resume}/resume.pdf"))
  ]
) ++ [

  # t4 goes under /items/ so that Dad's existing localStorage is retained
  (mkAsset "maynards.site" "items/t4" (
    let src = builtins.fetchGit {
        url = "https://github.com/quelklef/t4";
        rev = "5edc29596cafc2b62317e655c311bafb1d56660c";
      };
    in import src { inherit pkgs; }))

  (mkModule (
    let src_ = builtins.fetchGit
          { url = "https://github.com/quelklef/g-word-bot";
            rev = "702035d815d6bf331363b7a85c050888733b4aba";
          };
        src = /home/lark/me/dev/g-word-bot;
        token = secrets.g-word-bot-telegram-token-prod;
    in import (src + "/module.nix") { inherit token; }))

  (mkModule (
    let src = /home/lark/me/dev/qbpl_bot;
        token = secrets.qbpl-bot-telegram-token-prod;
    in import (src + "/module.nix") { inherit token; }))

  (mkAsset "maynards.site" "qbpl"
    (trivial "index.html" /home/lark/me/dev/qbpl_bot/analyze.html))

  (mkModule (
    let useLocal = false;
        src = if useLocal then ../mathsproofbot
              else builtins.fetchGit
                { url = "https://github.com/quelklef/mathsproofbot";
                  rev = "6a6c9202a538bf758bac21f42b5b52021fd988a0";
                };
    in import (src + "/nix/module.nix") { inherit pkgs; }))

  # fitch-v-js: Javascript fitch (legacy)
  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/fitch-v-js";
      to = "/items/fitch/full";
    })

  # fitch-v-elm: Elm Fitch (legacy)
  (mkAsset "maynards.site" "fitch-v-elm" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "3eb4f832a02a872710d769917e8f742ef8472ab6";
      };
    in import src { inherit pkgs; }))

  # fitch-v-ps: Purescript fitch
  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/fitch-v-ps";
      to = "/fitch";
    })

  # Stable Fitch
  (mkAsset "maynards.site" "fitch" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "b7e8ca0edfe7027e4afcb4b8d09139524a560264";
      };
    in import src))

  # Latest Fitch
  (mkAsset "maynards.site" "fitch-v-latest" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "0706942a2e27e8712f9281c53c153fd9f354171b";
      };
    in import src))

  # -- Nugs -- #

  (mkAsset "i-need-the-nugs.com" ""
    (trivial "nugs" ./src/nugs))

  # -- ζ -- #

  (
    (mkAsset "z.maynards.site" ""
      (trivial "z" (import /home/lark/me/dev/z { })))
    // { dontMatomo = true; }
  )

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

  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/items/fitch-new";
      to = "/fitch";
    })

  (mkAsset "maynards.site" "legacy-index"
    (fixup-index-link (trivial "index.html" "${legacy}/index.html")))

]);

in elems
