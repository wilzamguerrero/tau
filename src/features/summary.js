/**
 * PASO 3 — Consolidado general.
 *
 * Todos los estudiantes de la planilla contra todas las actividades
 * conocidas, incluidas las de ciclos anteriores que ya no vienen en la
 * planilla cargada. Esas se marcan con asterisco y no se exportan: sirven
 * para ver el curso completo, no para reescribir TAU.
 *
 * Una actividad sin nota cuenta como 0.0 en el promedio, que es la misma
 * regla del CSV. Asi lo que se ve aqui es lo que va a quedar en TAU.
 */

import { el, mostrar, vaciar } from '../ui/dom.js';
import { setStatus } from '../ui/feedback.js';
import { refs } from '../ui/refs.js';
import { compararEs, tituloActividad } from '../core/text.js';
import { esNotaValida, formatNota, promedio } from '../core/grades.js';
import { refrescarActividadesConocidas, state } from '../core/state.js';

/** Conecta el boton del consolidado. */
export function initSummary(refsUI) {
  refsUI.btnSummary.addEventListener('click', renderSummary);
}

export function renderSummary() {
  if (!state.tauData.length) {
    alert('Carga primero el archivo exportado de TAU/Moodle.');
    return;
  }

  refs.container.classList.add('is-hidden');
  mostrar(refs.toolbar, false);
  mostrar(refs.summaryView, true);
  setStatus(
    'list-checks',
    'Consolidado general de calificaciones (todos los estudiantes de la planilla).',
  );

  refrescarActividadesConocidas();
  const actividades = state.actividadesConocidas;

  pintarEncabezado(actividades);
  pintarFilas(actividades);
}

function pintarEncabezado(actividades) {
  const fila = vaciar(refs.tableHeader);
  fila.append(
    el('th', { text: 'Estudiante' }),
    el('th', { text: 'Correo Electrónico' }),
  );

  for (const act of actividades) {
    const enPlanilla = state.actividadesDetectadas.includes(act);
    fila.append(
      el('th', {
        text: tituloActividad(act) + (enPlanilla ? '' : ' *'),
        class: enPlanilla ? '' : 'th-historica',
        title: enPlanilla
          ? ''
          : 'Actividad con notas guardadas que no viene en la planilla ' +
            'cargada actualmente. No se exporta al CSV.',
      }),
    );
  }

  fila.append(el('th', { text: 'Promedio Final' }));
}

function pintarFilas(actividades) {
  const cuerpo = vaciar(refs.tableBody);

  // El nombre ya viene como "Apellidos Nombres", asi que ordenar por texto
  // es ordenar por apellido.
  const emails = Object.keys(state.notasGlobales).sort((a, b) =>
    compararEs(state.notasGlobales[a].nombre, state.notasGlobales[b].nombre),
  );

  for (const email of emails) {
    const est = state.notasGlobales[email];
    const fuera = est.enPlanilla === false;

    const tr = el('tr', { class: fuera ? 'fila-fuera' : '' }, [
      celdaNombre(est, fuera),
      el('td', { text: email }),
      ...actividades.map((act) => celdaNota(est[act])),
      el('td', {
        class: 'final-grade',
        text: promedio(est, actividades).toFixed(2),
      }),
    ]);

    cuerpo.append(tr);
  }
}

function celdaNombre(est, fuera) {
  const td = el('td', {
    class: 'col-name',
    text: est.nombre || '(sin nombre)',
  });

  if (fuera) {
    td.append(
      el('span', {
        class: 'tag-fuera',
        text: 'fuera de la planilla',
        title:
          'Tiene notas guardadas pero ya no aparece en la planilla cargada ' +
          'actualmente.',
      }),
    );
  }

  return td;
}

/** Una actividad sin nota se muestra como 0.0, igual que se exportara. */
function celdaNota(valor) {
  return esNotaValida(valor)
    ? el('td', { class: 'badge-grade', text: formatNota(valor) })
    : el('td', { class: 'badge-zero', text: formatNota(0) });
}
