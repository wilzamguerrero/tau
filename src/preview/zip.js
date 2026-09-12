/**
 * Previsualizacion del contenido de un .zip.
 *
 * Se lista lo que hay dentro y cada archivo se puede desplegar bajo demanda:
 * descomprimir todo de entrada haria inusable una entrega con 200 fotos.
 */

import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { cargarJSZip } from '../vendor/lazy.js';
import { genericBlock } from './generic.js';
import { notaCargando } from './notes.js';
import { iconForName } from './types.js';

/**
 * @param {Blob} blob
 * @param {string} nombre
 * @param {HTMLElement} mount
 * @param {(blob: Blob, nombre: string, mount: HTMLElement) => Promise<void>} renderPreview
 *   se recibe por parametro para evitar un ciclo de importaciones con index.js
 */
export async function renderZip(blob, nombre, mount, renderPreview) {
  const cargando = notaCargando('Leyendo comprimido…');
  mount.append(cargando);

  try {
    const JSZip = await cargarJSZip();
    const zip = await JSZip.loadAsync(blob);
    const entradas = Object.values(zip.files).filter((f) => !f.dir);
    cargando.remove();

    const lista = el('div', { class: 'zip-list' }, [
      el('div', { class: 'zip-head' }, [
        icon('file-archive'),
        el('span', { text: `${entradas.length} archivo(s) dentro de ${nombre}` }),
      ]),
    ]);

    for (const entrada of entradas) {
      lista.append(...filaZip(entrada, renderPreview));
    }

    mount.append(lista);
  } catch (err) {
    console.error('No se pudo abrir el comprimido', err);
    cargando.remove();
    mount.append(
      genericBlock(
        blob,
        nombre,
        'No se pudo abrir el comprimido. Descargalo para revisarlo.',
      ),
    );
  }
}

/** Una fila de la lista del zip, con su contenedor desplegable. */
function filaZip(entrada, renderPreview) {
  const corto = entrada.name.split('/').pop();
  const contenedor = el('div', { class: 'zip-holder' });
  const textoBtn = el('span', { text: 'Ver' });

  const boton = el(
    'button',
    {
      class: 'btn btn-sm',
      type: 'button',
      on: {
        async click() {
          // Ya descomprimido: solo se muestra u oculta.
          if (contenedor.dataset.loaded) {
            contenedor.classList.toggle('collapsed');
            return;
          }
          boton.disabled = true;
          textoBtn.textContent = 'Cargando…';

          const interno = await entrada.async('blob');
          const archivo = new File([interno], corto, { type: interno.type });
          await renderPreview(archivo, corto, contenedor);

          contenedor.dataset.loaded = '1';
          boton.disabled = false;
          textoBtn.textContent = 'Ver / ocultar';
        },
      },
    },
    [icon('eye'), textoBtn],
  );

  const fila = el('div', { class: 'zip-row' }, [
    el('span', { class: 'zip-name' }, [
      icon(iconForName(corto)),
      el('span', { text: entrada.name }),
    ]),
    boton,
  ]);

  return [fila, contenedor];
}
