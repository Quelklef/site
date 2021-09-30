{ port, useLocal, html-inject, pkgs }: let

ducks =
  let src =
    if useLocal then ../../umn-ducks
    else builtins.fetchGit
        { url = "https://github.com/Quelklef/umn-ducks";
          rev = "1c8a1def163028b49211a65db229bdfa7dce865e";
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
