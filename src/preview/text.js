/**
 * Previsualizacion de texto plano y codigo.
 */

import { MAX_TXT_CHARS } from '../config.js';
import { el } from '../ui/dom.js';
import { notaError } from './notes.js';

/**
 * Vuelca el contenido del archivo como texto.
 * Se recorta para no congelar el navegador con un log de 50 MB.
 *
 * @param {Blob} blob
 * @param {HTMLElement} mount
 */
export async function renderText(blob, mount) {
  try {
    let contenido = await blob.text();
    let extra = '';

    if (contenido.length > MAX_TXT_CHARS) {
      extra = '\n\n… (archivo recortado en la vista previa)';
      contenido = contenido.slice(0, MAX_TXT_CHARS);
    }

    mount.append(
      el('pre', { class: 'text-preview', text: contenido + extra }),
    );
  } catch {
    mount.append(
      notaError('No se pudo leer el contenido del archivo como texto.'),
    );
  }
}
