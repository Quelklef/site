{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  name = "website-index";
  src = ./.;
  buildInputs = [ pkgs.nodejs ];
  installPhase = ''
    node generate.js
    mkdir $out
    mv index.html $out
  '';
}
