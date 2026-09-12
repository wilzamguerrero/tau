/**
 * Buscador y filtro de la cuadricula.
 *
 * Se filtra ocultando en el DOM, no reconstruyendo: volver a pintar mandaria
 * a recargar todas las previsualizaciones, que es lo caro de esta pantalla.
 *
 * Los separadores de seccion que se quedan sin tarjetas visibles tambien se
 * ocultan; si no, quedaria un titulo "Entregas · Actividad 2" sobre un hueco.
 */

import { normalizeName } from '../core/text.js';
import { refs } from '../ui/refs.js';

/**
 * Aplica el texto del buscador y el modo del selector.
 * @returns {number} tarjetas visibles
 */
export function applyFilters() {
  const q = normalizeName(refs.searchBox.value);
  const modo = refs.filterMode.value;
  let visibles = 0;

  for (const card of refs.container.querySelectorAll('.card')) {
    const okNombre = !q || (card.dataset.name ?? '').includes(q);

    let okModo = true;
    if (modo === 'pendientes') {
      const nota = card.querySelector('.grade-input');
      okModo = !nota || nota.value === '';
    } else if (modo !== 'todas') {
      okModo = card.dataset.modo === modo;
    }

    const visible = okNombre && okModo;
    if (visible) visibles += 1;
    card.classList.toggle('hidden-card', !visible);
  }

  ocultarSeparadoresVacios();
  return visibles;
}

/** Oculta los separadores cuya seccion quedo sin tarjetas visibles. */
function ocultarSeparadoresVacios() {
  let separador = null;
  let vistas = 0;

  for (const nodo of refs.container.children) {
    if (nodo.classList.contains('divider')) {
      if (separador) separador.classList.toggle('hidden-card', vistas === 0);
      separador = nodo;
      vistas = 0;
    } else if (
      nodo.classList.contains('card') &&
      !nodo.classList.contains('hidden-card')
    ) {
      vistas += 1;
    }
  }

  if (separador) separador.classList.toggle('hidden-card', vistas === 0);
}

/** Conecta el buscador y el selector de filtro. */
export function initFilters(refsUI) {
  refsUI.searchBox.addEventListener('input', applyFilters);
  refsUI.filterMode.addEventListener('change', applyFilters);
}
