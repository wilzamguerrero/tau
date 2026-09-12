/**
 * Bloque para archivos que el navegador no puede incrustar.
 *
 * Da dos salidas: abrir/descargar el archivo, o intentar verlo como texto
 * (util para entregas con extension rara que en realidad son texto).
 */

import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { trackObjectUrl } from '../core/state.js';
import { iconForName } from './types.js';
import { renderText } from './text.js';

const MENSAJE_POR_DEFECTO =
  'Este tipo de archivo no se puede incrustar en el navegador.';

/**
 * @param {Blob} blob
 * @param {string} nombre
 * @param {string|null} [mensaje]
 * @returns {HTMLElement}
 */
export function genericBlock(blob, nombre, mensaje = null) {
  const ranura = el('div', { class: 'file-generic-slot' });

  const btnTexto = el(
    'button',
    {
      class: 'btn btn-sm',
      type: 'button',
      on: {
        async click() {
          btnTexto.disabled = true;
          await renderText(blob, ranura);
        },
      },
    },
    [icon('file-code'), document.createTextNode('Ver como texto')],
  );

  const enlace = el(
    'a',
    {
      class: 'btn btn-sm',
      href: trackObjectUrl(blob),
      target: '_blank',
      rel: 'noopener',
      download: nombre,
    },
    [icon('download'), document.createTextNode('Abrir / Descargar')],
  );

  return el('div', { class: 'file-generic' }, [
    el('div', { class: 'file-generic-icon ico-xl' }, [icon(iconForName(nombre))]),
    el('div', { text: mensaje || MENSAJE_POR_DEFECTO }),
    el('div', { class: 'file-generic-actions' }, [enlace, btnTexto]),
    ranura,
  ]);
}
