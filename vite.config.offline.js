import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Build "offline": genera UN solo archivo HTML autocontenido en dist-offline/.
 *
 * Sirve para el caso de uso original: copiar el archivo a una USB, hacerle
 * doble clic y calificar sin internet ni servidor. No lleva service worker
 * (no hace falta: todo el codigo va dentro del propio HTML).
 *
 *   npm run build:offline
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-offline',
    target: 'es2022',
    // Todo en un archivo: sin chunks dinamicos ni sourcemap externo.
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  plugins: [viteSingleFile()],
});
