/**
 * Reiniciar todo: otro grupo u otra materia.
 *
 * Borra la memoria, no los archivos. Pero borra notas, asi que pregunta
 * antes y recuerda que el respaldo .json es lo que permite volver atras.
 */

import { clearStats, setAvisos, setStatus } from '../ui/feedback.js';
import { mostrar, vaciar } from '../ui/dom.js';
import { resetState } from '../core/state.js';
import { clearLocalState } from '../core/storage.js';
import { resetSinEntrega } from './grid/pending.js';

/** Conecta el boton de reinicio. */
export function initReset(refs) {
  refs.btnClearSession.addEventListener('click', () => {
    const seguir = confirm(
      '¿Reiniciar todo? Se borrarán las notas en memoria para iniciar con ' +
        'un nuevo grupo o materia.\n\n' +
        'Si no has guardado el avance en un archivo .json, esto no se puede ' +
        'deshacer.',
    );
    if (!seguir) return;

    clearLocalState();
    resetState();
    resetSinEntrega();

    vaciar(refs.container);
    refs.container.classList.remove('is-hidden');
    mostrar(refs.summaryView, false);
    mostrar(refs.toolbar, false);
    setAvisos([]);
    clearStats();
    refs.searchBox.value = '';
    refs.filterMode.value = 'todas';

    setStatus(
      'info',
      'Memoria limpia. Puedes iniciar con una nueva planilla de TAU/Moodle.',
    );
  });
}
