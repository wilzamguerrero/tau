/**
 * Previsualizacion de hojas de calculo entregadas por estudiantes (.xlsx/.xls).
 *
 * Se muestran todas las hojas del libro, una debajo de otra.
 */

import { el } from '../ui/dom.js';
import { cargarXLSX } from '../vendor/lazy.js';
import { genericBlock } from './generic.js';
import { notaCargando } from './notes.js';
import { sanitizarHtml } from './sanitize.js';

/**
 * @param {Blob} blob
 * @param {string} nombre
 * @param {HTMLElement} mount
 */
export async function renderSheet(blob, nombre, mount) {
  const cargando = notaCargando('Leyendo hoja de calculo…');
  mount.append(cargando);

  try {
    const XLSX = await cargarXLSX();
    const buffer = await blob.arrayBuffer();
    const libro = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    cargando.remove();

    const doc = el('div', { class: 'doc-preview' });

    for (const hoja of libro.SheetNames) {
      doc.append(el('h4', { text: `Hoja: ${hoja}` }));
      const envoltura = el('div', { class: 'sheet-scroll' });
      envoltura.append(
        sanitizarHtml(XLSX.utils.sheet_to_html(libro.Sheets[hoja])),
      );
      doc.append(envoltura);
    }

    mount.append(doc);
  } catch (err) {
    console.error('No se pudo leer la hoja de calculo', err);
    cargando.remove();
    mount.append(genericBlock(blob, nombre, 'No se pudo leer la hoja de calculo.'));
  }
}
