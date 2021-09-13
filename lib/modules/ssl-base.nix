{ pkgs }:
{
  security.acme = {
    email = "eli.t.maynard+site-acme@gmail.com";
    # server = "https://acme-staging-v02.api.letsencrypt.org/directory";  # staging
    acceptTerms = true;
  };
  users.users.nginx.extraGroups = [ "acme" ];  # idk if this is necessary or not
}
