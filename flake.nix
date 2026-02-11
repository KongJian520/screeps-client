{
  description = "Dev shell with node and pnpm (flake)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [ 
            pkgs.nodejs 
            pkgs.pnpm
          ];

          shellHook = ''
            echo "Entering flake devShell — node: $(node -v 2>/dev/null || echo n/a) pnpm: $(pnpm -v 2>/dev/null || echo n/a)"
          '';
        };
      }
    );
}
