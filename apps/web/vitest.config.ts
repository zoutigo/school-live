import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 10000,
    // Le pool par defaut (un thread par CPU logique, 16 ici) sature la
    // memoire de la machine de dev (swap sature a >12 Go) et fait timeout
    // aleatoirement des tests par ailleurs valides (waitFor sous charge).
    // Un plafond a 2 threads flake encore (confirme 2026-09-16 : deux echecs
    // consecutifs sur des fichiers differents et sans rapport avec le
    // changement en cours, chacun passant isolement juste apres). Passer a
    // un seul thread supprime la pression memoire concurrente au prix d'un
    // run plus long, mais stable.
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
