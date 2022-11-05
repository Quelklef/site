let
  system = builtins.currentSystem;
  rev = "22e4347db2ea8f0880ddcedcfb163552eb57a7ef";
  fetched = builtins.fetchTarball "https://github.com/NixOS/nixpkgs/archive/${rev}.tar.gz";
in import fetched { inherit system; }
