/**
 * Estado de la sesion de calificacion.
 *
 * Un unico objeto `state` reemplaza las variables globales sueltas del
 * prototipo. Los modulos lo leen directamente y lo modifican solo a traves
 * de las funciones de este archivo, para que los datos derivados
 * (actividades conocidas, indice de nombres) nunca queden desfasados.
 */

import { CAMPOS_META } from '../config.js';
import {
  activityKey,
  compararNumerico,
  nameKey,
} from './text.js';
import { getNombreCompleto, tieneApellido } from './spreadsheet.js';

/** @typedef {{nombre:string, email:string, info?:object, enPlanilla?:boolean, [actividad:string]:any}} Estudiante */

export const state = {
  /** Filas crudas de la planilla cargada. */
  tauData: [],
  /** Encabezados de la planilla cargada. */
  tauColumns: [],
  /** Columnas de la planilla que son actividades calificables. */
  actividadesDetectadas: [],
  /** email -> Estudiante (incluye las notas por columna de actividad). */
  notasGlobales: /** @type {Record<string, Estudiante>} */ ({}),

  // ---- Derivados (no editar a mano: usar las funciones de abajo) ----
  /** Union de las actividades de la planilla y las que ya tienen notas. */
  actividadesConocidas: [],
  /** nombreNormalizado -> [emails] */
  nameIndex: /** @type {Record<string, string[]>} */ ({}),

  // ---- Recursos del navegador ----
  /** URLs de blobs vivas, para liberarlas al re-renderizar. */
  objectUrls: /** @type {string[]} */ ([]),
  /** Manejador del .json de avance, para sobrescribir siempre el mismo. */
  archivoAvance: /** @type {FileSystemFileHandle|null} */ (null),
};

/** Columnas de actividad con nota guardadas para un estudiante. */
export function clavesNota(est) {
  return Object.keys(est || {}).filter((k) => !CAMPOS_META.has(k));
}

/**
 * Union de las actividades de la planilla actual y las que ya tienen notas
 * guardadas. Asi una actividad calificada en un ciclo anterior nunca
 * desaparece del consolidado.
 */
export function refrescarActividadesConocidas() {
  const set = new Set(state.actividadesDetectadas);
  for (const est of Object.values(state.notasGlobales)) {
    for (const k of clavesNota(est)) set.add(k);
  }
  state.actividadesConocidas = [...set].sort((a, b) => {
    const porActividad = compararNumerico(activityKey(a), activityKey(b));
    return porActividad || a.localeCompare(b);
  });
}

/**
 * Reescribe los nombres guardados al formato de listado "Apellidos Nombres".
 * La fila original de la planilla queda en `est.info`, asi que un avance
 * restaurado desde el navegador o desde un respaldo antiguo tambien queda
 * corregido.
 */
function refrescarNombres() {
  for (const est of Object.values(state.notasGlobales)) {
    if (!est.info || !tieneApellido(est.info)) continue;
    const n = getNombreCompleto(est.info);
    if (n) est.nombre = n;
  }
}

/** (Re)construye el indice nombre -> emails y limpia la cache de emparejado. */
export function rebuildNameIndex() {
  refrescarNombres();
  state.nameIndex = {};
  for (const [email, est] of Object.entries(state.notasGlobales)) {
    const key = nameKey(est.nombre);
    if (!key) continue;
    (state.nameIndex[key] ??= []).push(email);
  }
  invalidarCacheEmparejado();
}

/**
 * Dada una columna de otro momento, devuelve la columna equivalente de la
 * planilla actual (misma actividad con el encabezado nuevo). Si hay duda,
 * la deja igual: es mejor conservar una columna de mas que mover una nota
 * a la actividad equivocada.
 */
export function columnaEquivalente(col) {
  if (state.actividadesDetectadas.includes(col)) return col;
  const k = activityKey(col);
  if (!k) return col;
  const candidatas = state.actividadesDetectadas.filter(
    (x) => activityKey(x) === k,
  );
  return candidatas.length === 1 ? candidatas[0] : col;
}

/** Recalcula todo lo derivado de golpe. */
export function refrescarDerivados() {
  refrescarActividadesConocidas();
  rebuildNameIndex();
}

/** Libera las URLs de blobs creadas para las previsualizaciones. */
export function clearObjectUrls() {
  for (const u of state.objectUrls) {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ya liberada */
    }
  }
  state.objectUrls = [];
}

/** Crea una URL de blob y la registra para liberarla despues. */
export function trackObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  state.objectUrls.push(url);
  return url;
}

/** Vacia la sesion completa (otro grupo u otra materia). */
export function resetState() {
  clearObjectUrls();
  state.tauData = [];
  state.tauColumns = [];
  state.actividadesDetectadas = [];
  state.notasGlobales = {};
  state.actividadesConocidas = [];
  state.nameIndex = {};
  state.archivoAvance = null;
  invalidarCacheEmparejado();
}

// ---------------------------------------------------------------------------
// Cache del emparejamiento carpeta -> estudiante
// ---------------------------------------------------------------------------
// El emparejado aproximado recorre a todos los estudiantes, y se consulta una
// vez por carpeta y otra vez por cada comparacion al ordenar la cuadricula.
// Sin cache eso crece al cuadrado y se siente en cursos grandes.

const cacheEmparejado = new Map();

export function getCacheEmparejado() {
  return cacheEmparejado;
}

export function invalidarCacheEmparejado() {
  cacheEmparejado.clear();
}
