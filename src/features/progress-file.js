/**
 * Guardar y restaurar el avance en un archivo .json.
 *
 * Es el respaldo de verdad, el que el profesor archiva y lleva de un
 * computador a otro. localStorage solo protege de cerrar la pestana.
 *
 * Dos decisiones pensadas para el uso real:
 *
 *   - Un solo archivo que crece con el curso. En Chrome/Edge se sobrescribe
 *     siempre el mismo, sin "Avance (3).json" ni dudas sobre cual es el
 *     ultimo.
 *   - Al restaurar se COMBINA por defecto. Reemplazar borraria las
 *     actividades que el respaldo no trae, y esa perdida no tiene vuelta.
 *     En un conflicto gana la nota que ya estaba en pantalla, que es la que
 *     el profesor acaba de poner.
 */

import { ARCHIVO_AVANCE, STORAGE_VERSION } from '../config.js';
import { descargar } from '../ui/dom.js';
import { renderStats, setAvisos, setStatus } from '../ui/feedback.js';
import {
  clavesNota,
  columnaEquivalente,
  refrescarDerivados,
  state,
} from '../core/state.js';
import { aplicarEstado, estadoParaArchivo, saveLocalStateNow } from '../core/storage.js';

/** Conecta los controles de guardar y cargar avance. */
export function initProgressFile(refs) {
  refs.btnSaveProgress.addEventListener('click', guardarAvance);

  refs.loadProgressInput.addEventListener('change', async (e) => {
    const archivo = e.target.files?.[0];
    refs.loadProgressInput.value = ''; // permite recargar el mismo archivo
    if (!archivo) return;
    await cargarAvance(archivo);
  });
}

// ---------------------------------------------------------------------------
// Guardar
// ---------------------------------------------------------------------------

async function guardarAvance() {
  if (!Object.keys(state.notasGlobales).length) {
    alert('Todavía no hay datos para guardar.');
    return;
  }

  const texto = JSON.stringify(estadoParaArchivo(), null, 2);
  const hora = new Date().toLocaleTimeString();

  if (window.showSaveFilePicker && (await sobrescribir(texto, hora))) return;

  // Resto de navegadores: descarga normal a la carpeta de descargas.
  descargar(
    new Blob([texto], { type: 'application/json' }),
    ARCHIVO_AVANCE,
  );
  setStatus(
    'save',
    `Avance descargado como <strong>${ARCHIVO_AVANCE}</strong>. Reemplaza el ` +
      'anterior para mantener un solo archivo.',
    'ok',
  );
}

/**
 * Chrome/Edge: escribe siempre sobre el mismo archivo elegido una vez.
 * @returns {Promise<boolean>} true si quedo guardado
 */
async function sobrescribir(texto, hora) {
  try {
    state.archivoAvance ??= await window.showSaveFilePicker({
      suggestedName: ARCHIVO_AVANCE,
      types: [
        {
          description: 'Avance de notas',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });

    const w = await state.archivoAvance.createWritable();
    await w.write(texto);
    await w.close();

    setStatus(
      'save',
      `Avance guardado en <strong>${state.archivoAvance.name}</strong> a las ` +
        `${hora}. Es el mismo archivo de siempre: se sobrescribe, no se ` +
        'duplica.',
      'ok',
    );
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return true; // el profesor cancelo
    console.warn('No se pudo sobrescribir el archivo de avance', err);
    state.archivoAvance = null; // se reintenta como descarga normal
    return false;
  }
}

// ---------------------------------------------------------------------------
// Restaurar
// ---------------------------------------------------------------------------

async function cargarAvance(archivo) {
  let guardado;
  try {
    guardado = JSON.parse(await archivo.text());
  } catch {
    alert('El archivo no es un respaldo válido: no se pudo leer el JSON.');
    return;
  }

  if (!guardado || typeof guardado !== 'object' || !guardado.notasGlobales) {
    alert('El archivo no tiene el formato de respaldo de esta herramienta.');
    return;
  }

  const hayDatos = Object.keys(state.notasGlobales).length > 0;
  const combinar =
    !hayDatos ||
    confirm(
      'Ya hay datos cargados en memoria.\n\n' +
        'ACEPTAR = combinar el respaldo con lo actual (recomendado: no se ' +
        'pierde ninguna actividad).\n\n' +
        'CANCELAR = reemplazar todo con el contenido del respaldo.',
    );

  const resumen = combinar
    ? combinarRespaldo(guardado)
    : reemplazarPorRespaldo(guardado);

  refrescarDerivados();
  saveLocalStateNow();
  informar({ ...resumen, guardado, combinar, hayDatos });
}

/** Vuelca el respaldo encima, descartando lo que hubiera. */
function reemplazarPorRespaldo(guardado) {
  aplicarEstado(guardado);
  return { estNuevos: 0, notasNuevas: 0, conflictos: 0 };
}

/** Suma el respaldo a lo que ya hay, sin pisar nada. */
function combinarRespaldo(guardado) {
  let estNuevos = 0;
  let notasNuevas = 0;
  let conflictos = 0;

  for (const [email, orig] of Object.entries(guardado.notasGlobales)) {
    const actual = state.notasGlobales[email];

    if (!actual) {
      state.notasGlobales[email] = {
        nombre: orig.nombre || '',
        email,
        info: orig.info || {},
      };
      estNuevos += 1;
    } else if (!actual.nombre) {
      actual.nombre = orig.nombre || '';
    }

    for (const colOrig of clavesNota(orig)) {
      // Si el encabezado cambio entre descargas, la nota entra en la columna
      // que la planilla usa ahora.
      const col = columnaEquivalente(colOrig);
      const nota = state.notasGlobales[email][col];

      if (nota === undefined) {
        state.notasGlobales[email][col] = orig[colOrig];
        notasNuevas += 1;
      } else if (Number(nota) !== Number(orig[colOrig])) {
        conflictos += 1; // gana la que ya estaba en pantalla
      }
    }
  }

  // Se queda con la planilla mas completa, la que trae mas actividades.
  const actsResp = guardado.actividadesDetectadas || [];
  if (!state.tauData.length || actsResp.length > state.actividadesDetectadas.length) {
    state.tauData = guardado.tauData || state.tauData;
    state.tauColumns = guardado.tauColumns || state.tauColumns;
    if (actsResp.length) state.actividadesDetectadas = actsResp;
  }

  return { estNuevos, notasNuevas, conflictos };
}

function informar({
  estNuevos,
  notasNuevas,
  conflictos,
  guardado,
  combinar,
  hayDatos,
}) {
  const total = Object.keys(state.notasGlobales).length;

  setStatus(
    'check-circle',
    `Avance ${combinar && hayDatos ? 'combinado' : 'cargado'}: ` +
      `<strong>${total}</strong> estudiantes y ` +
      `<strong>${state.actividadesConocidas.length}</strong> actividad(es) ` +
      'en total.',
    'ok',
  );

  renderStats([
    { num: total, label: 'Estudiantes', icon: 'users', tono: 'acc' },
    {
      num: state.actividadesConocidas.length,
      label: 'Actividades',
      icon: 'list-checks',
      tono: 'info',
    },
    { num: estNuevos, label: 'Recuperados', icon: 'user-plus', tono: 'ok' },
    { num: notasNuevas, label: 'Notas sumadas', icon: 'file-down', tono: 'ok' },
  ]);

  const avisos = [];

  if (Number(guardado.version) > STORAGE_VERSION) {
    avisos.push(
      `RESPALDO MÁS NUEVO — el archivo se guardó con una versión posterior ` +
        `de la herramienta (v${guardado.version} contra v${STORAGE_VERSION}). ` +
        'Se cargó lo que se pudo interpretar; revisa el consolidado antes de ' +
        'exportar.',
    );
  }
  if (conflictos) {
    avisos.push(
      `NOTAS DISTINTAS — en ${conflictos} caso(s) el respaldo tenía otra ` +
        'nota para la misma actividad. Se conservó la que ya estaba en ' +
        'memoria; si querías la del respaldo, reinicia y cárgalo solo.',
    );
  }
  if (!hayDatos || !combinar) {
    avisos.push(
      'RESPALDO APLICADO — ahora puedes cargar la planilla nueva (paso 01) ' +
        'para agregar actividades sin perder estas notas.',
    );
  }

  setAvisos(avisos);
}
