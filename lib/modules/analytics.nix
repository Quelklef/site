{ pkgs }: let

inherit (import ../const.nix) secrets primary-host;

in {
  services.matomo = {
    enable = true;
    nginx = {
      serverName = "stats.maynards.site";

      useACMEHost = primary-host;
      enableACME = false;

      # matomo obfuscation
      locations."~ /zngbzb13.(php|js).definitely-not" = {
        priority = 50;
        extraConfig = "rewrite ^.*(php|js)\.definitely-not$ /matomo.$1;";
      };
    };
  };

  services.mysql = {
    enable = true;
    package = pkgs.mariadb;
    bind = "localhost";  # only available locally
    ensureDatabases = [ "analytics" ];
    ensureUsers = [
      {
        name = "analytics";
        ensurePermissions = { "analytics.*" = "ALL PRIVILEGES"; };
      }
    ];
  };

  systemd.services.set-analytics-db-passwd = {
    description = "analytics database password setup";
    wants = [ "mysql.service" ];
    wantedBy = [ "multi-user.target" ];
    script = ''
      pass=$(cat /run/keys/analytics-db-passwd)
      cmd="GRANT ALL PRIVILEGES ON analytics TO analytics@localhost IDENTIFIED BY '$pass'"
      ${pkgs.mariadb}/bin/mysql analytics -e "$cmd"
    '';
    serviceConfig = {
      User = "root";
      PermissionsStartOnly = true;
      RemainAfterExit = true;
    };
  };

  deployment.keys.analytics-db-passwd.text = secrets.website-analytics-db-passwd;
}
