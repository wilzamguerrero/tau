/**
 * Punto de entrada.
 *
 * Este archivo no tiene logica propia: resuelve las referencias del HTML,
 * dibuja los iconos y conecta cada paso con su modulo. Si algo no funciona,
 * el modulo del paso es donde hay que mirar.
 *
 * Nada de lo que se carga aqui sale del computador: no hay peticiones de
 * red, ni analitica, ni servidor. Las planillas y las entregas se leen en
 * el navegador y se quedan ahi.
 */

import './styles/index.css';

import { initRefs, refs } from './ui/refs.js';
import { hydrateIcons } from './ui/icons.js';
import { agregarAviso, setStatus } from './ui/feedback.js';
import { loadLocalState, onStorageError, saveLocalStateNow } from './core/storage.js';
import { state } from './core/state.js';

import { initImportTau } from './features/import-tau.js';
import { initLoadFolders } from './features/load-folders.js';
import { initFilters } from './features/filters.js';
import { initZeroMissing } from './features/zero-missing.js';
import { initSummary } from './features/summary.js';
import { initExportCsv } from './features/export-csv.js';
import { initProgressFile } from './features/progress-file.js';
import { initReset } from './features/reset.js';

function arrancar() {
  initRefs();
  hydrateIcons(document);

  // Si el navegador se niega a guardar (modo privado, cuota llena), el
  // profesor tiene que saberlo antes de calificar dos horas sin respaldo.
  onStorageError(agregarAviso);

  initImportTau(refs);
  initLoadFolders(refs);
  initFilters(refs);
  initZeroMissing(refs);
  initSummary(refs);
  initExportCsv(refs);
  initProgressFile(refs);
  initReset(refs);

  restaurarSesion();

  // El guardado normal es con retardo; al cerrar la pestana no hay tiempo
  // para esperarlo.
  window.addEventListener('pagehide', () => saveLocalStateNow());
}

/** Recupera el trabajo de la sesion anterior, si el navegador lo tenia. */
function restaurarSesion() {
  let restaurado = false;
  try {
    restaurado = loadLocalState();
  } catch (err) {
    console.error('No se pudo restaurar la sesion anterior', err);
    agregarAviso(
      'SESIÓN ANTERIOR — la copia guardada en este navegador no se pudo ' +
        'leer y se ignoró. Si tienes el archivo .json de avance, cárgalo ' +
        'con "Cargar avance".',
    );
    return;
  }

  if (!restaurado) return;

  const estudiantes = Object.keys(state.notasGlobales).length;
  setStatus(
    'rotate-ccw',
    `Avance restaurado: <strong>${estudiantes}</strong> estudiantes, ` +
      `<strong>${state.actividadesConocidas.length}</strong> actividad(es). ` +
      'Carga la planilla nueva si agregaste otra actividad, o las carpetas ' +
      'para seguir evaluando.',
  );
}

/** Un error al arrancar no puede quedarse solo en la consola. */
function fallarVisiblemente(err) {
  console.error('No se pudo iniciar la herramienta', err);
  const nodo = document.getElementById('status');
  if (nodo) {
    nodo.className = 'statusline statusline-bad';
    nodo.textContent = `No se pudo iniciar la herramienta: ${err.message}`;
  }
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        arrancar();
      } catch (err) {
        fallarVisiblemente(err);
      }
    });
  } else {
    arrancar();
  }
} catch (err) {
  fallarVisiblemente(err);
}
