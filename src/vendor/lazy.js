/**
 * Carga diferida de las librerias pesadas.
 *
 * xlsx (~900 KB), mammoth (~1 MB) y jszip solo hacen falta cuando el profesor
 * abre una planilla o previsualiza un .docx/.zip. Antes se descargaban las
 * tres desde un CDN en cada apertura de la pagina, aunque no se usaran, y sin
 * internet la herramienta quedaba a medias.
 *
 * Ahora viajan dentro del proyecto y se cargan la primera vez que se
 * necesitan. Cada promesa se guarda, asi que la segunda llamada es inmediata.
 */

/** @type {Promise<typeof import('xlsx')>|null} */
let xlsxPromise = null;

/** SheetJS: leer y exportar planillas. */
export function cargarXLSX() {
  xlsxPromise ??= import('xlsx');
  return xlsxPromise;
}

/** @type {Promise<any>|null} */
let mammothPromise = null;

/** Mammoth: convertir .docx a HTML. */
export function cargarMammoth() {
  mammothPromise ??= import('mammoth/mammoth.browser.js').then(
    (m) => m.default ?? m,
  );
  return mammothPromise;
}

/** @type {Promise<any>|null} */
let jszipPromise = null;

/** JSZip: mirar dentro de un .zip. */
export function cargarJSZip() {
  jszipPromise ??= import('jszip').then((m) => m.default ?? m);
  return jszipPromise;
}
