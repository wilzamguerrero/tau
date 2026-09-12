/**
 * PASO 2 (segunda mitad) — Pintar la cuadricula de entregas.
 *
 * Esta es la pantalla donde el profesor pasa el tiempo, asi que el orden en
 * que aparecen las cosas esta pensado para eso:
 *
 *   1. Las entregas reales, agrupadas por actividad y ordenadas por apellido.
 *   2. Al final, los que no entregaron, tambien por actividad.
 *
 * Lo segundo es deliberado: un estudiante sin carpeta no es visible en el
 * disco, y sin esta seccion se le olvidaria calificar. Aparece aqui, con su
 * campo de nota, y se puede resolver en bloque con "poner 0".
 */

import { agregar, el, mostrar, vaciar } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { renderStats, setAvisos, setStatus } from '../../ui/feedback.js';
import { refs } from '../../ui/refs.js';
import { compararEs, tituloActividad } from '../../core/text.js';
import { listaEstudiantes, matchFolderToEmail, nombreParaCarpeta } from '../../core/matching.js';
import { clearObjectUrls, state } from '../../core/state.js';
import { saveLocalState } from '../../core/storage.js';
import { applyFilters } from '../filters.js';
import { construirTarjeta } from './card.js';
import { agrupar, columnForActivitySeg } from './grouping.js';
import { resetSinEntrega } from './pending.js';

/**
 * @param {{file: File, relPath: string}[]} registros
 * @param {string[]} carpetasVacias
 * @param {boolean} modoCompleto  true si se uso el selector moderno, que si
 *   informa las carpetas vacias
 */
export function procesarEntregas(registros, carpetasVacias, modoCompleto) {
  if (!state.tauData.length) {
    alert('Carga primero el archivo Excel/CSV descargado de TAU/Moodle (Paso 1).');
    return;
  }

  prepararVista();

  const { grupos, actividadesVacias } = agrupar(registros, carpetasVacias);
  if (!grupos.length && !actividadesVacias.length) {
    setStatus(
      'alert-triangle',
      'No se encontraron entregas de estudiantes en la carpeta seleccionada.',
      'warn',
    );
    return;
  }

  ordenarGrupos(grupos);

  const estudiantes = listaEstudiantes();
  /** actividad -> { seg, asignados:Set } */
  const actividadInfo = {};
  const registrarActividad = (col, seg) =>
    (actividadInfo[col] ??= { seg, asignados: new Set() });

  const conteos = pintarEntregas({ grupos, estudiantes, registrarActividad });

  // Actividades cuya carpeta completa esta vacia: nadie entrego, pero la
  // actividad existe y hay que calificarla igual.
  for (const seg of actividadesVacias) {
    registrarActividad(columnForActivitySeg(seg), seg);
  }

  const cSinCarpeta = pintarNoEntregaron({ actividadInfo, estudiantes });

  informar({ ...conteos, cSinCarpeta, actividadInfo, estudiantes, modoCompleto });

  applyFilters();
  saveLocalState();
}

/** Deja la pantalla lista para recibir una cuadricula nueva. */
function prepararVista() {
  mostrar(refs.summaryView, false);
  refs.container.classList.remove('is-hidden');
  mostrar(refs.toolbar, true);
  clearObjectUrls();
  vaciar(refs.container);
  resetSinEntrega();
}

/**
 * Orden de la cuadricula: por actividad y, dentro de cada una, por apellido.
 * Se usa el nombre de la planilla cuando la carpeta ya quedo emparejada,
 * para que "Perez Juan" no aparezca donde diga "Juan Perez".
 */
function ordenarGrupos(grupos) {
  grupos.sort((a, b) => {
    if (a.activitySeg !== b.activitySeg) {
      return a.activitySeg.localeCompare(b.activitySeg);
    }
    return compararEs(
      nombreParaCarpeta(a.studentSeg),
      nombreParaCarpeta(b.studentSeg),
    );
  });
}

/** Tarjetas de las carpetas que existen en el disco. */
function pintarEntregas({ grupos, estudiantes, registrarActividad }) {
  const dupTracker = {};
  const dupMsgs = [];
  let cEmparejados = 0;
  let cRevisar = 0;
  let cSin = 0;
  let cVacias = 0;

  let colActual = null;
  let contadorSeccion = null;
  let nSeccion = 0;

  for (const grupo of grupos) {
    const activityCol = columnForActivitySeg(grupo.activitySeg);
    const info = registrarActividad(activityCol, grupo.activitySeg);

    if (activityCol !== colActual) {
      if (contadorSeccion) contadorSeccion.textContent = `${nSeccion} carpetas`;
      colActual = activityCol;
      nSeccion = 0;
      contadorSeccion = separador(
        `Entregas · ${tituloActividad(activityCol)}`,
        'folder-open',
      );
    }
    nSeccion += 1;

    const match = matchFolderToEmail(grupo.studentSeg);
    const assignedEmail = match.email;

    if (assignedEmail) {
      info.asignados.add(assignedEmail);

      // Dos carpetas para el mismo estudiante en la misma actividad: una de
      // las dos notas se va a perder si el profesor no lo nota.
      const dk = `${activityCol}||${assignedEmail}`;
      dupTracker[dk] = (dupTracker[dk] ?? 0) + 1;
      if (dupTracker[dk] === 2) {
        dupMsgs.push(
          `• "${state.notasGlobales[assignedEmail].nombre}" quedó asignado ` +
            `a 2 carpetas en ${tituloActividad(activityCol)}.`,
        );
      }
    }

    if (match.status === 'exact') cEmparejados += 1;
    else if (match.status === 'none') cSin += 1;
    else cRevisar += 1;

    const vacia = grupo.files.length === 0;
    if (vacia) cVacias += 1;

    refs.container.append(
      construirTarjeta({
        activitySeg: grupo.activitySeg,
        activityCol,
        studentSeg: grupo.studentSeg,
        files: grupo.files,
        assignedEmail,
        matchStatus: match.status,
        modo: vacia ? 'vacia' : 'entrega',
        estudiantes,
      }),
    );
  }

  if (contadorSeccion) contadorSeccion.textContent = `${nSeccion} carpetas`;

  return {
    cEmparejados,
    cRevisar,
    cSin,
    cVacias,
    dupMsgs,
    nEntregas: grupos.length - cVacias,
  };
}

/** Tarjetas de los estudiantes que no tienen carpeta en cada actividad. */
function pintarNoEntregaron({ actividadInfo, estudiantes }) {
  let total = 0;

  for (const col of Object.keys(actividadInfo).sort((a, b) => a.localeCompare(b))) {
    const info = actividadInfo[col];
    const faltantes = estudiantes.filter((s) => !info.asignados.has(s.email));
    if (!faltantes.length) continue;

    separador(`No entregaron · ${tituloActividad(col)}`, 'ban', 'bad').textContent =
      `${faltantes.length} estudiantes`;

    for (const s of faltantes) {
      total += 1;
      refs.container.append(
        construirTarjeta({
          activitySeg: info.seg,
          activityCol: col,
          studentSeg: s.nombre,
          files: [],
          assignedEmail: s.email,
          matchStatus: 'exact',
          modo: 'sinCarpeta',
          estudiantes,
        }),
      );
    }
  }

  return total;
}

/**
 * Separador de seccion a todo lo ancho de la cuadricula.
 * @returns {HTMLElement} la etiqueta de conteo, para llenarla despues
 */
function separador(texto, iconName, tono) {
  const conteo = el('span', { class: 'divider-count' });
  refs.container.append(
    agregar(el('div', { class: `divider${tono ? ` divider-${tono}` : ''}` }), [
      icon(iconName),
      el('span', { text: texto }),
      conteo,
    ]),
  );
  return conteo;
}

/** Fichas numericas y avisos de lo que el profesor debe revisar. */
function informar({
  nEntregas,
  cEmparejados,
  cRevisar,
  cSin,
  cVacias,
  cSinCarpeta,
  dupMsgs,
  actividadInfo,
  estudiantes,
  modoCompleto,
}) {
  const nActs = Object.keys(actividadInfo).length;

  setStatus(
    'folder-check',
    `<strong>${nEntregas}</strong> entrega(s) con archivos en ` +
      `<strong>${nActs}</strong> actividad(es) · planilla de ` +
      `<strong>${estudiantes.length}</strong> estudiantes.`,
  );

  renderStats([
    { num: nEntregas, label: 'Con archivos', icon: 'folder-check', tono: 'acc' },
    { num: cEmparejados, label: 'Emparejados', icon: 'check', tono: 'ok' },
    { num: cRevisar, label: 'Por revisar', icon: 'alert-triangle', tono: 'warn' },
    { num: cSin, label: 'Sin emparejar', icon: 'x', tono: 'bad' },
    { num: cVacias, label: 'Carpeta vacía', icon: 'folder-x', tono: 'warn' },
    { num: cSinCarpeta, label: 'No entregaron', icon: 'ban', tono: 'bad' },
  ]);

  const avisos = [];

  if (cSin) {
    avisos.push(
      `SIN EMPAREJAR — ${cSin} entrega(s) no se pudieron asociar ` +
        'automáticamente: usa el selector "Asignar a" en cada tarjeta roja. ' +
        'Mientras no las asignes, esos estudiantes también aparecerán como ' +
        '"no entregó" al final.',
    );
  }
  if (cRevisar) {
    avisos.push(
      `POR REVISAR — ${cRevisar} entrega(s) se emparejaron de forma ` +
        'aproximada o con nombre duplicado: verifica el estudiante antes de ' +
        'calificar.',
    );
  }
  if (cVacias) {
    avisos.push(
      `CARPETA VACÍA — ${cVacias} carpeta(s) de estudiante existen pero no ` +
        'tienen ningún archivo.',
    );
  }
  if (cSinCarpeta) {
    avisos.push(
      `NO ENTREGARON — ${cSinCarpeta} caso(s) sin carpeta de entrega. Están ` +
        'al final de la lista (filtro "Solo sin carpeta") y puedes ' +
        'calificarlos igual o usar el botón "Poner 0 a los que no entregaron".',
    );
  }
  if (dupMsgs.length) {
    avisos.push(
      'DUPLICADOS — entregas repetidas para un mismo estudiante:\n' +
        dupMsgs.join('\n'),
    );
  }
  if (!modoCompleto) {
    avisos.push(
      'MODO CLÁSICO — el selector antiguo del navegador no informa las ' +
        'carpetas vacías, así que un estudiante con carpeta vacía aparecerá ' +
        'como "no existe la carpeta". Usa el botón del paso 02 en Chrome o ' +
        'Edge para distinguir ambos casos.',
    );
  }

  setAvisos(avisos);
}
