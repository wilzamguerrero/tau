/**
 * Previsualizador universal de entregas.
 *
 * Un unico punto de entrada, `renderPreview`, que reparte segun el tipo de
 * archivo. Cada formato vive en su propio modulo.
 *
 * Todo se muestra desde un blob local: ningun archivo del estudiante sale
 * del computador del profesor.
 */

import { el } from '../ui/dom.js';
import { trackObjectUrl } from '../core/state.js';
import { genericBlock } from './generic.js';
import { kindOf } from './types.js';
import { renderDocx } from './docx.js';
import { renderSheet } from './sheet.js';
import { renderText } from './text.js';
import { renderZip } from './zip.js';

/**
 * Muestra un archivo dentro de `mount`.
 *
 * @param {Blob} blob
 * @param {string} nombre
 * @param {HTMLElement} mount
 */
export async function renderPreview(blob, nombre, mount) {
  switch (kindOf(nombre)) {
    case 'img':
      mount.append(imagen(blob, nombre, mount));
      return;

    case 'pdf':
      mount.append(el('iframe', { src: trackObjectUrl(blob) }));
      return;

    case 'video':
      mount.append(video(blob, nombre, mount));
      return;

    case 'audio':
      mount.append(
        el('audio', { src: trackObjectUrl(blob), controls: true }),
      );
      return;

    case 'html':
      // La entrega puede traer scripts: se aisla en un iframe de origen
      // opaco, sin acceso a esta pagina ni a sus datos.
      mount.append(
        el('iframe', {
          src: trackObjectUrl(blob),
          attrs: { sandbox: 'allow-scripts' },
        }),
      );
      return;

    case 'text':
      await renderText(blob, mount);
      return;

    case 'docx':
      await renderDocx(blob, nombre, mount);
      return;

    case 'sheet':
      await renderSheet(blob, nombre, mount);
      return;

    case 'zip':
      await renderZip(blob, nombre, mount, renderPreview);
      return;

    default:
      mount.append(genericBlock(blob, nombre));
  }
}

function imagen(blob, nombre, mount) {
  const img = el('img', {
    src: trackObjectUrl(blob),
    loading: 'lazy',
    alt: nombre,
    on: {
      error() {
        img.remove();
        mount.append(genericBlock(blob, nombre, 'La imagen no se pudo mostrar.'));
      },
    },
  });
  return img;
}

function video(blob, nombre, mount) {
  const nodo = el('video', {
    src: trackObjectUrl(blob),
    controls: true,
    preload: 'metadata',
    on: {
      error() {
        nodo.remove();
        mount.append(
          genericBlock(
            blob,
            nombre,
            'El navegador no puede reproducir este formato de video ' +
              '(por ejemplo .mkv, .avi o .wmv). Abrelo con tu reproductor.',
          ),
        );
      },
    },
  });
  return nodo;
}
