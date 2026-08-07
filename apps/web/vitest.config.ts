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
    // Capper les workers stabilise la suite au prix d'un run plus long.
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
  },
});
