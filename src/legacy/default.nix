{ pkgs ? import <nixpkgs> {} }:

let

python-pkgs = ppkgs:
  let
    mkpkg =
      pname: version: sha256:
      ppkgs.callPackage
        ({ buildPythonPackage, fetchPypi, pyyaml }:
            buildPythonPackage rec {
              buildInputs = [ pyyaml ];
              inherit pname version;
              src = fetchPypi { inherit pname version sha256; };
              doCheck = false;
            })
        {};

  in with ppkgs;
    [ markdown
      watchdog
      docopt
      python-frontmatter
      (mkpkg "unplate" "0.2.8" "011bs2sa3z5md8zqa2yr139pwnv9dbma8n91qbvxw51xz131yad0")
    ];

python = pkgs.python38.withPackages python-pkgs;

submod-papers =
  builtins.fetchGit { url = "ssh://git@github.com/quelklef/papers"; rev = "a92f3cb727cd71266995a11ae4ee6d76147460f0"; };
submod-fitch =
  builtins.fetchGit { url = "ssh://git@github.com/quelklef/fitch"; rev = "b2c1dfb28e467cfc9421b61a9525cd1b92bc3feb"; };
submod-minesweeper =
  builtins.fetchGit { url = "ssh://git@github.com/quelklef/minesweeper"; rev = "44af9c8c98a81c652b98ffa7d3d11aba1b1f7db2"; };

in

pkgs.stdenv.mkDerivation {
  name = "site-old";
  buildInputs = [ python pkgs.texlive.combined.scheme-full pkgs.sass ];
  src = ./.;
  installPhase = ''
    cp -r $src/. .

    cp -r ${submod-papers}/. src/assets/papers
    cp -r ${submod-fitch}/. src/items/fitch/full
    cp -r ${submod-minesweeper}/. src/items/minesweeper/full
    chmod -R +w ./

    python3.8 ./site.py build --from-scratch
    mkdir $out
    cp -r build/. $out
  '';
}
