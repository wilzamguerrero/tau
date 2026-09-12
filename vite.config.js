import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Configuracion de build.
 *
 * `BASE_PATH` permite el mismo codigo en los tres destinos:
 *   - Vercel / Cloudflare Pages (dominio propio) -> "/"  (valor por defecto)
 *   - GitHub Pages en un subdirectorio           -> "/tau/"
 *
 * El workflow de GitHub Pages exporta BASE_PATH=/tau/ antes de construir.
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,

  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
    // Las librerias pesadas (xlsx, mammoth, jszip) se cargan con import()
    // dinamico, asi que Vite ya las separa en chunks propios. Se suben los
    // limites del aviso para que no ensucie la salida del build.
    chunkSizeWarningLimit: 1200,
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Las librerias pesadas entran al precache para que la herramienta
        // funcione completa sin internet (docx, zip y excel incluidos).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'Visor y Calificador de Entregas TAU',
        short_name: 'Visor TAU',
        description:
          'Revisa y califica las entregas de tus estudiantes junto a la planilla de TAU/Moodle, sin subir nada a internet.',
        lang: 'es',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#101015',
        theme_color: '#d4f000',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
