/**
 * Normalizacion de texto y lectura de nombres de carpetas de Moodle.
 *
 * Funciones puras: no tocan el DOM ni el estado. Son la base del
 * emparejamiento entre carpetas y estudiantes, y por eso conviene
 * mantenerlas sin efectos secundarios.
 */

import { PALABRAS_ACTIVIDAD } from '../config.js';

/** Sin tildes, minusculas, espacios colapsados. */
export function normalizeName(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // marcas diacriticas combinantes
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Trozos comparables de un nombre: sin tildes, sin signos, en minusculas.
 *
 * Se corta por cualquier cosa que no sea letra o numero para que
 * "Gomez-Ruiz, Ana" y "Gomez Ruiz Ana" den los mismos trozos: las comas y
 * los guiones aparecen tanto en las carpetas de Moodle como en la planilla.
 */
export function nameTokens(s) {
  return normalizeName(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Clave de comparacion independiente del orden: "perez ana" y "ana perez"
 * dan lo mismo. Permite listar por apellido sin romper el emparejamiento
 * con las carpetas de Moodle, que vienen como "Nombre Apellido".
 */
export function nameKey(s) {
  return nameTokens(s).sort().join(' ');
}

const PALABRAS = PALABRAS_ACTIVIDAD.join('|');
const RE_ACTIVIDAD_NUM = new RegExp(`(${PALABRAS})\\s*[:#\\-]?\\s*(\\d+)`, 'g');
const RE_ACTIVIDAD = new RegExp(`(${PALABRAS})`);

/**
 * Extrae una "clave de actividad" tipo "actividad 1" de un texto
 * (nombre de carpeta o encabezado de columna). Devuelve '' si no reconoce
 * ninguna palabra de actividad.
 */
export function activityKey(s) {
  const n = normalizeName(s);

  // Se toma la ultima coincidencia con numero: en "Tarea:Actividad 3 (Real)"
  // la que describe la actividad es "actividad 3", no "tarea".
  RE_ACTIVIDAD_NUM.lastIndex = 0;
  let m;
  let conNumero = null;
  while ((m = RE_ACTIVIDAD_NUM.exec(n)) !== null) {
    conNumero = `${m[1]} ${m[2]}`;
  }
  if (conNumero) return conNumero;

  const soloPalabra = n.match(RE_ACTIVIDAD);
  return soloPalabra ? soloPalabra[1] : '';
}

/**
 * De un nombre de carpeta de Moodle obtiene el nombre limpio del estudiante.
 * Ej: "Juan Perez_999260_assignsubmission_file_" -> "Juan Perez"
 */
export function studentNameFromFolder(folder) {
  return (folder ?? '')
    .toString()
    .replace(/_\d+_assignsubmission.*$/i, '')
    .replace(/_\d+_?$/, '')
    .replace(/_+$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quita el prefijo "Tarea:" y los adornos del encabezado de TAU. */
export function tituloActividad(col) {
  return (col ?? '')
    .toString()
    .replace(/tarea:/i, '')
    .trim();
}

/** Comparador alfabetico en espanol, insensible a tildes y mayusculas. */
export function compararEs(a, b) {
  return (a ?? '').localeCompare(b ?? '', 'es', { sensitivity: 'base' });
}

/** Comparador que entiende numeros: "actividad 2" antes que "actividad 10". */
export function compararNumerico(a, b) {
  return (a ?? '').localeCompare(b ?? '', 'es', { numeric: true });
}
