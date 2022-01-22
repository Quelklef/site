{ port, useLocal, html-inject, pkgs }: let

ducks =
  let src =
    if useLocal then ../../umn-ducks
    else builtins.fetchGit
        { url = "https://github.com/Quelklef/umn-ducks";
          rev = "ffbe3be979ed7bf733371db614a8a080b45d2b9f";
        };
  in
    import (src + "/default.nix") { inherit pkgs; };

in
{
  systemd.services.umn-ducks = {
    description = "umn ducks";
    wants = [ "multi-user.target" ];
    after = [ "network.target" ];
    script = ''
      export UMN_DUCKS_PORT=${builtins.toString port}
      export UMN_DUCKS_HTML_INJECT=$(cat ${html-inject})
      export NODE_ENV=production
      cd ${ducks}
      ./run.sh
    '';
    serviceConfig = {
      Type = "simple";
    };
  };
}
