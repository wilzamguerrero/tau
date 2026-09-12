import { defineConfig } from 'vitest/config';

/**
 * Configuracion de pruebas, aparte de `vite.config.js` a proposito: las
 * pruebas no necesitan el plugin de PWA ni el `base` del despliegue.
 *
 * El entorno por defecto es Node porque el nucleo (notas, nombres, planilla)
 * es codigo puro sin DOM. Los archivos que si necesitan navegador lo piden
 * uno por uno con el comentario `@vitest-environment jsdom`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      include: ['src/core/**', 'src/preview/sanitize.js', 'src/features/grid/grouping.js'],
      reporter: ['text', 'html'],
    },
  },
});
