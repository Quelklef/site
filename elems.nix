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
  let spath = "${path}"; in
  pkgs.stdenv.mkDerivation {
    inherit name;
    dontUnpack = true;
    installPhase = ''
      if [ -d ${spath} ]; then
        mkdir $out
        cp -r ${spath}/. $out
      elif [ -f ${spath} ]; then
        mkdir $out
        cp ${spath} $out/${name}
      else
        echo >2 "wtf"
        exit 1
      fi
    '';
  };


secrets = import <secrets>;


elems = [

  # -- maynards.site -- #

  (mkAsset "maynards.site" ""
    (trivial "index.html" (
      import ./src/index/default.nix { inherit pkgs; })))

  (mkAsset "daygen.maynards.site" "" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/daygen";
        rev = "bb2c4490ac53fb0b611143845904276f72b47bd2";
      };
    in import src { inherit pkgs; }))

  (mkAsset "maynards.site" "ellipses"
    (trivial "index.html" ./src/ellipses.html))

  (mkAsset "maynards.site" "prime-spirals" (
    builtins.fetchGit
      { url = "https://github.com/quelklef/prime-spirals";
        rev = "d75b28387c199c6fa7e7b73f730b239a9b6c2be1";
      }))

  (mkAsset "maynards.site" "cascading-contexts"
    (trivial "cascading-contexts" ./src/cascading-contexts))

  (mkAsset "maynards.site" "pokepref"
    (trivial "pokepref" (
      let src = builtins.fetchGit {
          url = "https://github.com/Quelklef/pokepref";
          rev = "c81c30db398eedfacceb70981d615b2df537fb8a";
          ref = "main";
        };
      in src)))

  (mkAsset "maynards.site" "files"
    (trivial "files" ./src/files))

] ++ (
  let resume = import ./src/resume { inherit pkgs; };
  in [
    (mkAsset "maynards.site" "resume" (trivial "index.html" "${resume}/resume.html"))
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

  /* g-word bot temp disabled at Dad's request
  (mkModule (
    let src = builtins.fetchGit
          { url = "https://github.com/quelklef/g-word-bot";
            rev = "d4e525e3461ac7c5924c7e6d4a4e8d792b6f78f1";
          };
        token = secrets.g-word-bot-telegram-token-prod;
    in import (src + "/module.nix") { inherit token; }))
  */

  (mkModule (
    let src = /per/dev/qbpl_bot;
        token = secrets.qbpl-bot-telegram-token-prod;
    in import (src + "/module.nix") { inherit token; }))

  (mkAsset "maynards.site" "qbpl"
    (trivial "index.html" /per/dev/qbpl_bot/analyze.html))

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
 
  # Latest Fitch
  (mkAsset "maynards.site" "fitch" (
    let src = builtins.fetchGit {
        url = "https://github.com/Quelklef/fitch";
        rev = "0de39303760f7eeb5646b933b9d99d241bc309ea";
      };
    in import src))

  # -- stickbug -- #

  (mkRedirect
    { permanence = "temporary";
      host = "maynards.site";
      from = "/uploads/button.gif";
      to = "https://www.youtube.com/watch?v=fC7oUOUEEi4";
    })

  # -- Nugs -- #

  (mkAsset "i-need-the-nugs.com" ""
    (trivial "nugs" ./src/nugs))

  # -- sfti.me -- #

  (
    (mkAsset "sfti.me" ""
      (trivial "sft" ./src/sft))
      // { dontMatomo = true; }
  )

  # -- ζ (zeta) -- #

  (
    let
      deriv =
        pkgs.stdenv.mkDerivation {
          name = "z";
          dontUnpack = true;
          installPhase = ''
            cp -r ${/per/dev/z/notes} ./notes
            ${import /per/dev/z/repo {}} compile --src=notes --dest=out
            mkdir -p $out
            cp -r ./out/. $out
          '';
        };

    in (mkAsset "z.maynards.site" "" (trivial "z" "${deriv}"))
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
