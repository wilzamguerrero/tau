/**
 * "Poner 0 a los que no entregaron".
 *
 * Al cerrar una actividad, lo que queda sin entrega se califica en 0.0. Son
 * decenas de campos y hacerlo a mano es donde se cometen los errores, asi
 * que se resuelve en un paso — pero con confirmacion, porque escribe notas
 * en bloque.
 *
 * Solo toca los casos de la vista actual, y solo los que estan asignados a
 * un estudiante: una entrega sin emparejar no tiene a quien calificar.
 */

import { ESCALA } from '../config.js';
import { saveLocalStateNow } from '../core/storage.js';
import { casosSinEntrega } from './grid/pending.js';
import { applyFilters } from './filters.js';

/** Conecta el boton de la barra de herramientas. */
export function initZeroMissing(refs) {
  refs.btnZeroMissing.addEventListener('click', () => {
    const casos = casosSinEntrega();

    if (!casos.length) {
      alert('No hay casos sin entrega en la vista actual.');
      return;
    }

    const cero = ESCALA.min.toFixed(ESCALA.decimales);
    const seguir = confirm(
      `Se colocará ${cero} a ${casos.length} caso(s) sin entrega (sin ` +
        'carpeta o carpeta vacía). ¿Continuar?',
    );
    if (!seguir) return;

    for (const input of casos) {
      input.value = String(ESCALA.min);
      // El manejador del campo es el unico que escribe en el estado: se
      // dispara en vez de duplicar aqui la logica de guardado.
      input.dispatchEvent(new Event('input'));
    }

    saveLocalStateNow();
    applyFilters(); // el filtro "pendientes" ya no debe mostrarlos
  });
}
