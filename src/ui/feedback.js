/**
 * Retroalimentacion al profesor: linea de estado, fichas numericas y avisos.
 *
 * Tres piezas separadas con proposito distinto:
 *   - `setStatus`   : que acaba de pasar (una linea, siempre visible).
 *   - `renderStats` : los numeros del proceso (cuantos emparejados, etc.).
 *   - `setAvisos`   : lo que el profesor debe revisar antes de exportar.
 */

import { el, vaciar } from './dom.js';
import { icon } from './icons.js';
import { refs } from './refs.js';

/** @typedef {'info'|'ok'|'warn'|'bad'} Tono */

/**
 * Escribe la linea de estado.
 *
 * @param {string} iconName
 * @param {string} html  texto fijo de la interfaz; puede traer <strong>
 * @param {Tono} [tono]
 */
export function setStatus(iconName, html, tono = 'info') {
  const nodo = refs.statusLine;
  vaciar(nodo);
  nodo.className = `statusline statusline-${tono}`;
  nodo.append(icon(iconName), el('span', { html }));
}

/**
 * Pinta las fichas numericas de resumen.
 *
 * @param {{num:number, label:string, icon:string, tono?:string}[]} items
 */
export function renderStats(items) {
  const nodo = vaciar(refs.statsBar);
  for (const it of items ?? []) {
    nodo.append(
      el('div', { class: `stat ${it.tono ? `stat-${it.tono}` : ''}`.trim() }, [
        el('div', { class: 'stat-num', text: String(it.num) }),
        el('div', { class: 'stat-label' }, [
          icon(it.icon),
          el('span', { text: it.label }),
        ]),
      ]),
    );
  }
}

/** Limpia las fichas numericas. */
export function clearStats() {
  vaciar(refs.statsBar);
}

/**
 * Muestra la lista de avisos (o la oculta si no hay ninguno).
 * @param {string[]} avisos
 */
export function setAvisos(avisos) {
  const texto = (avisos ?? []).filter(Boolean).join('\n\n');
  refs.warnBanner.textContent = texto;
  refs.warnBanner.classList.toggle('is-visible', texto.length > 0);
}

/** Agrega un aviso a los que ya hay, sin borrarlos. */
export function agregarAviso(aviso) {
  if (!aviso) return;
  const previos = refs.warnBanner.textContent;
  refs.warnBanner.textContent = previos ? `${previos}\n\n${aviso}` : aviso;
  refs.warnBanner.classList.add('is-visible');
}
