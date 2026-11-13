import { defineConfig } from 'vite';

// base './' : chemins relatifs, pour que le jeu marche sur GitHub Pages
// (https://<user>.github.io/<repo>/) sans config supplémentaire.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
});
