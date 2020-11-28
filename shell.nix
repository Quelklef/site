{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.buildPackages.pipenv
    pkgs.texlive.combined.scheme-full  # TODO: downgrade to scheme-basic holy shit
    pkgs.sass
  ];
}
