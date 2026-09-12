/**
 * Previsualizacion de documentos de Word (.docx).
 */

import { el } from '../ui/dom.js';
import { cargarMammoth } from '../vendor/lazy.js';
import { genericBlock } from './generic.js';
import { notaCargando } from './notes.js';
import { sanitizarHtml } from './sanitize.js';

/**
 * @param {Blob} blob
 * @param {string} nombre
 * @param {HTMLElement} mount
 */
export async function renderDocx(blob, nombre, mount) {
  const cargando = notaCargando('Convirtiendo documento de Word…');
  mount.append(cargando);

  try {
    const mammoth = await cargarMammoth();
    const buffer = await blob.arrayBuffer();
    const resultado = await mammoth.convertToHtml({ arrayBuffer: buffer });
    cargando.remove();

    const doc = el('div', { class: 'doc-preview' });
    const contenido = sanitizarHtml(resultado.value);

    if (contenido.childNodes.length) doc.append(contenido);
    else doc.append(el('em', { text: '(documento vacio)' }));

    mount.append(doc);
  } catch (err) {
    console.error('No se pudo convertir el .docx', err);
    cargando.remove();
    mount.append(
      genericBlock(
        blob,
        nombre,
        'No se pudo convertir el .docx. Abrelo aparte para revisarlo.',
      ),
    );
  }
}
