/**
 * Referencias a los nodos del HTML, en un solo lugar.
 *
 * Si se renombra un id en index.html, este archivo es el unico que hay que
 * tocar, y el arranque falla con un mensaje claro en vez de con un
 * "null is not an object" a mitad de camino.
 */

const IDS = {
  // Paso 1 y 2
  tauFileInput: 'tauFileInput',
  folderInput: 'folderInput',
  btnLoadFolder: 'btnLoadFolder',

  // Paso 3 y exportacion
  btnSummary: 'btnSummary',
  btnExportTAU: 'btnExportTAU',
  summaryView: 'summaryView',
  tableHeader: 'tableHeader',
  tableBody: 'tableBody',

  // Avance
  btnSaveProgress: 'btnSaveProgress',
  loadProgressInput: 'loadProgressInput',
  btnClearSession: 'btnClearSession',

  // Estado
  statusLine: 'status',
  statsBar: 'statsBar',
  warnBanner: 'warnBanner',

  // Herramientas y cuadricula
  toolbar: 'toolbar2',
  searchBox: 'searchBox',
  filterMode: 'filterMode',
  btnZeroMissing: 'btnZeroMissing',
  container: 'container',
};

/** @type {Record<keyof typeof IDS, HTMLElement>} */
export const refs = {};

/** Resuelve todas las referencias. Lanza si falta alguna. */
export function initRefs() {
  const faltantes = [];
  for (const [nombre, id] of Object.entries(IDS)) {
    const nodo = document.getElementById(id);
    if (!nodo) faltantes.push(`${nombre} (#${id})`);
    refs[nombre] = nodo;
  }
  if (faltantes.length) {
    throw new Error(
      `Faltan elementos en index.html: ${faltantes.join(', ')}`,
    );
  }
  return refs;
}
