/**
 * PASO 1 — Cargar la planilla de TAU / Moodle.
 *
 * Lo delicado de este paso no es leer el Excel, es fusionarlo con lo que ya
 * habia. Un curso se califica por partes: se descarga la planilla, se
 * califica la actividad 1, semanas despues se descarga otra planilla que ya
 * trae la actividad 2 y quiza encabezados distintos. Nada de lo ya calificado
 * puede perderse en el camino.
 *
 * Por eso la carga hace cuatro cosas, en este orden:
 *   1. Migrar notas cuyo encabezado cambio de texto (misma actividad).
 *   2. Mezclar estudiantes por correo, conservando las notas puestas aqui.
 *   3. Adoptar las notas que ya venian escritas en TAU (para no pisarlas).
 *   4. Marcar a quienes ya no figuran en la planilla, sin borrarlos.
 */

import { renderStats, setAvisos, setStatus } from '../ui/feedback.js';
import { tituloActividad } from '../core/text.js';
import { activityKey } from '../core/text.js';
import {
  getEmail,
  getNombreCompleto,
  isActivityColumn,
} from '../core/spreadsheet.js';
import { parseNota } from '../core/grades.js';
import {
  clavesNota,
  refrescarDerivados,
  state,
} from '../core/state.js';
import { saveLocalStateNow } from '../core/storage.js';
import { cargarXLSX } from '../vendor/lazy.js';

/** Conecta el input de la planilla. */
export function initImportTau(refs) {
  refs.tauFileInput.addEventListener('change', async (e) => {
    const archivo = e.target.files?.[0];
    refs.tauFileInput.value = ''; // permite recargar el mismo archivo
    if (!archivo) return;

    setStatus('loader', 'Leyendo la planilla…');

    let filas;
    try {
      filas = await leerPlanilla(archivo);
    } catch (err) {
      console.error('No se pudo leer la planilla', err);
      alert(
        'No se pudo leer el archivo. Verifica que sea un .xlsx/.xls/.csv ' +
          'valido de TAU/Moodle.',
      );
      setStatus('alert-triangle', 'No se pudo leer la planilla.', 'bad');
      return;
    }

    if (!filas.length) {
      alert('El archivo no tiene registros validos.');
      setStatus('alert-triangle', 'La planilla no tiene registros.', 'warn');
      return;
    }

    state.tauData = filas;
    aplicarPlanilla(filas);
  });
}

/** Lee el archivo y devuelve las filas de la primera hoja. */
async function leerPlanilla(archivo) {
  const XLSX = await cargarXLSX();
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  return XLSX.utils.sheet_to_json(hoja, { defval: '' });
}

/** Fusiona la planilla recien leida con el estado actual. */
function aplicarPlanilla(filas) {
  const conocidasAntes = new Set(state.actividadesConocidas);
  const columnasNuevas = Object.keys(filas[0]);
  const actividadesNuevas = columnasNuevas.filter(isActivityColumn);

  const { migradas, migraciones } = migrarEncabezados(actividadesNuevas);
  const { nuevosEst, importadas, emailsPlanilla } = mezclarEstudiantes(
    filas,
    actividadesNuevas,
  );
  const fuera = marcarFueraDePlanilla(emailsPlanilla);

  state.tauColumns = columnasNuevas;
  state.actividadesDetectadas = actividadesNuevas;
  refrescarDerivados();
  saveLocalStateNow();

  const agregadas = state.actividadesDetectadas.filter(
    (a) => !conocidasAntes.has(a),
  );
  const sinEmail = filas.filter((f) => !getEmail(f)).length;

  informar({
    filas,
    agregadas,
    migradas,
    migraciones,
    importadas,
    nuevosEst,
    fuera,
    sinEmail,
  });
}

/**
 * (1) Si TAU cambio el texto del encabezado, mueve la nota a la columna nueva
 * de la MISMA actividad. Por ejemplo:
 *   "Tarea:ACTIVIDAD 1"  ->  "Tarea:Actividad 1 (Real)"
 *
 * Si hay mas de una columna candidata no se toca nada: es mejor dejar la nota
 * donde esta que moverla a la actividad equivocada.
 */
function migrarEncabezados(actividadesNuevas) {
  let migradas = 0;
  const migraciones = [];

  for (const est of Object.values(state.notasGlobales)) {
    for (const col of clavesNota(est)) {
      if (actividadesNuevas.includes(col)) continue; // la columna sigue igual

      const k = activityKey(col);
      if (!k) continue;

      const candidatas = actividadesNuevas.filter((c) => activityKey(c) === k);
      if (candidatas.length !== 1) continue; // ambiguo: no se toca

      const destino = candidatas[0];
      if (est[destino] !== undefined) continue; // ya hay nota en el destino

      est[destino] = est[col];
      delete est[col];
      migradas++;
      if (!migraciones.some(([desde]) => desde === col)) {
        migraciones.push([col, destino]);
      }
    }
  }

  return { migradas, migraciones };
}

/**
 * (2) y (3) Mezcla los estudiantes por correo y adopta las notas que ya
 * venian escritas en la planilla.
 *
 * Una nota de TAU solo se adopta si aqui no hay ninguna para esa actividad.
 * Asi, al exportar, no se sobrescribe con 0,0 una calificacion que el
 * profesor ya habia subido antes de empezar a usar la herramienta.
 */
function mezclarEstudiantes(filas, actividadesNuevas) {
  let nuevosEst = 0;
  let importadas = 0;
  const emailsPlanilla = new Set();

  for (const fila of filas) {
    const email = getEmail(fila);
    if (!email) continue;
    emailsPlanilla.add(email);

    const existente = state.notasGlobales[email];
    if (!existente) {
      state.notasGlobales[email] = {
        nombre: getNombreCompleto(fila),
        email,
        info: fila,
      };
      nuevosEst++;
    } else {
      existente.nombre = getNombreCompleto(fila) || existente.nombre;
      existente.info = fila; // las notas ya puestas quedan intactas
    }
    state.notasGlobales[email].enPlanilla = true;

    for (const col of actividadesNuevas) {
      if (state.notasGlobales[email][col] !== undefined) continue;
      const n = parseNota(fila[col]);
      if (n !== null) {
        state.notasGlobales[email][col] = n;
        importadas++;
      }
    }
  }

  return { nuevosEst, importadas, emailsPlanilla };
}

/**
 * (4) Estudiantes con notas que ya no figuran en esta planilla: se conservan
 * y quedan marcados. Un retiro a mitad de semestre no debe borrar su historia.
 */
function marcarFueraDePlanilla(emailsPlanilla) {
  let fuera = 0;
  for (const [email, est] of Object.entries(state.notasGlobales)) {
    if (!emailsPlanilla.has(email)) {
      est.enPlanilla = false;
      fuera++;
    }
  }
  return fuera;
}

/** Linea de estado, fichas numericas y avisos del paso 1. */
function informar({
  filas,
  agregadas,
  migradas,
  migraciones,
  importadas,
  nuevosEst,
  fuera,
  sinEmail,
}) {
  const listaActs = state.actividadesDetectadas.map(tituloActividad).join(' · ');

  setStatus(
    'check-circle',
    `Planilla cargada · <strong>${filas.length}</strong> estudiantes · ` +
      `actividades: ${listaActs || '—'}.`,
    'ok',
  );

  renderStats([
    { num: filas.length, label: 'En la planilla', icon: 'users', tono: 'acc' },
    {
      num: state.actividadesConocidas.length,
      label: 'Actividades',
      icon: 'list-checks',
      tono: 'info',
    },
    {
      num: agregadas.length,
      label: 'Nuevas',
      icon: 'sparkles',
      tono: agregadas.length ? 'ok' : 'info',
    },
    { num: nuevosEst, label: 'Estudiantes nuevos', icon: 'user-plus', tono: 'info' },
    { num: importadas, label: 'Notas importadas', icon: 'file-down', tono: 'ok' },
    {
      num: sinEmail,
      label: 'Sin correo',
      icon: 'alert-triangle',
      tono: sinEmail ? 'bad' : 'ok',
    },
  ]);

  const avisos = [];

  if (agregadas.length) {
    avisos.push(
      'ACTIVIDADES NUEVAS — se agregaron a la evaluacion: ' +
        `${agregadas.map(tituloActividad).join(', ')}. ` +
        'Las notas anteriores se conservan tal cual.',
    );
  }
  if (migradas) {
    avisos.push(
      `ENCABEZADOS ACTUALIZADOS — ${migradas} nota(s) se movieron a la ` +
        'columna nueva de la misma actividad:\n' +
        migraciones.map(([de, a]) => `• "${de}"  →  "${a}"`).join('\n'),
    );
  }
  if (importadas) {
    avisos.push(
      `NOTAS IMPORTADAS — ${importadas} calificacion(es) que ya venian ` +
        'escritas en la planilla se cargaron a la herramienta, para no ' +
        'sobrescribirlas al exportar.',
    );
  }
  if (fuera) {
    avisos.push(
      `FUERA DE LA PLANILLA — ${fuera} estudiante(s) con notas guardadas ya ` +
        'no aparecen en este listado. Se conservan y quedan marcados en el ' +
        'consolidado.',
    );
  }
  if (sinEmail) {
    avisos.push(
      `SIN CORREO — ${sinEmail} fila(s) de la planilla no tienen correo ` +
        'electronico y no se podran emparejar con las carpetas.',
    );
  }

  setAvisos(avisos);
}
