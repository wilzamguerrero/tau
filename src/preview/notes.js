/**
 * Avisos cortos dentro de una previsualizacion (cargando / error).
 */

import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

/**
 * @param {string} clase   'loading-note' o 'preview-error'
 * @param {string} iconName
 * @param {string} texto
 * @param {boolean} [girar] anima el icono (para esperas)
 */
export function miniNote(clase, iconName, texto, girar = false) {
  return el('div', { class: clase }, [
    icon(iconName, girar ? 'spin' : ''),
    el('span', { text: texto }),
  ]);
}

/** Aviso de espera con icono girando. */
export function notaCargando(texto) {
  return miniNote('loading-note', 'loader', texto, true);
}

/** Aviso de error de previsualizacion. */
export function notaError(texto) {
  return miniNote('preview-error', 'alert-triangle', texto);
}
