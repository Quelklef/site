{ pkgs ? import <nixpkgs> {} }: let

in pkgs.stdenv.mkDerivation {
  name = "resume";
  src = ./.;
  buildInputs = [ pkgs.wkhtmltopdf ];

  installPhase = ''
    mkdir -p $out
    cp $src/resume.html $out
    wkhtmltopdf -s Letter -T 0 -R 0 -B 0 -L 0 $src/resume.html $out/resume.pdf
  '';

  shellHook = ''

  echo "Run command 'devt'"

  devt() {
    # For some reason the result pdf is different when produced
    # via nix-build vs in a nix-shell. This is not fixed by any of:
    # 1. Upgrading nixpkgs
    # 2. Using nix-shell --pure
    # 3. Getting fontconfig from nixpkgs; or
    # 4. Setting FONTCONFIG_PATH or FONTCONFIG_FILE
    # As such, defer to nix-build even when in a nix-shell
    echo resume.html | ${pkgs.entr}/bin/entr -c nix-build
  }

  '';
}
