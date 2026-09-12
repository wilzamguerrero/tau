/**
 * Emparejamiento entre una carpeta de Moodle y un estudiante de la planilla.
 *
 * Moodle nombra las carpetas como "Nombre Apellido_123456_assignsubmission_file_",
 * mientras la planilla lista "Apellidos Nombres". Aqui se resuelve esa
 * diferencia y se marca con que nivel de confianza se hizo, para que el
 * profesor pueda revisar los casos dudosos en vez de confiar a ciegas.
 */

import { nameKey, nameTokens, studentNameFromFolder } from './text.js';
import { getCacheEmparejado, state } from './state.js';

/**
 * @typedef {'exact'|'fuzzy'|'dup'|'none'} EstadoEmparejado
 * @typedef {{email: string|null, status: EstadoEmparejado}} Emparejado
 */

/**
 * Empareja el nombre de una carpeta con el correo de un estudiante.
 *
 * - `exact`: el nombre coincide con un unico estudiante.
 * - `dup`:   coincide con dos estudiantes homonimos (hay que revisar).
 * - `fuzzy`: coincide en 2 o mas apellidos/nombres y sin empate.
 * - `none`:  no se pudo emparejar; queda para asignacion manual.
 *
 * @param {string} folderSeg nombre de la carpeta del estudiante
 * @returns {Emparejado}
 */
export function matchFolderToEmail(folderSeg) {
  const cache = getCacheEmparejado();
  if (cache.has(folderSeg)) return cache.get(folderSeg);

  const resultado = calcularEmparejado(folderSeg);
  cache.set(folderSeg, resultado);
  return resultado;
}

/** @returns {Emparejado} */
function calcularEmparejado(folderSeg) {
  const key = nameKey(studentNameFromFolder(folderSeg));

  const exactos = state.nameIndex[key];
  if (exactos?.length) {
    // Dos estudiantes con nombre identico: se toma el primero y se avisa.
    return { email: exactos[0], status: exactos.length === 1 ? 'exact' : 'dup' };
  }

  // Respaldo: coincidencia por tokens (nombres + apellidos) sin ambiguedad.
  const tokens = key.split(' ').filter(Boolean);
  if (tokens.length < 2) return { email: null, status: 'none' };

  let mejor = null;
  let mejorPuntaje = 0;
  let empate = false;

  for (const [email, est] of Object.entries(state.notasGlobales)) {
    const otros = nameTokens(est.nombre);
    const compartidos = tokens.filter((t) => otros.includes(t)).length;

    if (compartidos > mejorPuntaje) {
      mejorPuntaje = compartidos;
      mejor = email;
      empate = false;
    } else if (compartidos === mejorPuntaje && compartidos > 0) {
      empate = true;
    }
  }

  if (mejor && mejorPuntaje >= 2 && !empate) {
    return { email: mejor, status: 'fuzzy' };
  }
  return { email: null, status: 'none' };
}

/**
 * Nombre a mostrar para una carpeta: el de la planilla si quedo emparejada,
 * o el que trae la propia carpeta si no.
 */
export function nombreParaCarpeta(folderSeg) {
  const m = matchFolderToEmail(folderSeg);
  return m.email
    ? state.notasGlobales[m.email].nombre
    : studentNameFromFolder(folderSeg);
}

/** Lista de estudiantes ordenada por apellido, para los selectores. */
export function listaEstudiantes() {
  return Object.entries(state.notasGlobales)
    .map(([email, est]) => ({ email, nombre: est.nombre }))
    .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', {
      sensitivity: 'base',
    }));
}
