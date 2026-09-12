/**
 * Lectura de la planilla de TAU / Moodle.
 *
 * Los encabezados cambian entre instalaciones y entre idiomas ("Nombre",
 * "Nombres", "Direccion de correo", "Email"...), asi que aqui vive toda la
 * tolerancia a esas variaciones y el resto del codigo trabaja con datos ya
 * interpretados.
 */

import { PALABRAS_ACTIVIDAD } from '../config.js';
import { normalizeName } from './text.js';

/**
 * Busca una columna de la planilla de forma flexible.
 *
 * `patrones` va en orden de prioridad: primero se intenta una coincidencia
 * exacta con cada patron y solo despues una parcial. Asi "Nombre" gana
 * frente a "Nombre de usuario" aunque las dos contengan "nombre".
 *
 * @param {object} fila         una fila de la planilla
 * @param {string[]} patrones   textos a buscar, ya normalizados
 * @param {string[]} [excluir]  descarta columnas que contengan estos textos
 */
export function findKey(fila, patrones, excluir = []) {
  const claves = Object.keys(fila || {});
  const candidatas = claves.filter(
    (k) => !excluir.some((x) => normalizeName(k).includes(x)),
  );

  for (const p of patrones) {
    const exacta = candidatas.find((k) => normalizeName(k) === p);
    if (exacta) return exacta;
  }
  for (const p of patrones) {
    const parcial = candidatas.find((k) => normalizeName(k).includes(p));
    if (parcial) return parcial;
  }
  return null;
}

/** Correo electronico del estudiante, en minusculas. '' si no tiene. */
export function getEmail(fila) {
  const k = findKey(fila, [
    'direccion de correo',
    'correo electronico',
    'correo',
    'email',
    'e-mail',
  ]);
  return k ? (fila[k] ?? '').toString().toLowerCase().trim() : '';
}

/**
 * Nombre en formato de listado: "Apellidos Nombres".
 * Es el orden con el que un profesor revisa una lista de clase.
 */
export function getNombreCompleto(fila) {
  // "nombre de usuario" es el login de Moodle, no el nombre de la persona.
  const kNombre = findKey(fila, ['nombre(s)', 'nombres', 'nombre'], [
    'nombre de usuario',
    'usuario',
  ]);
  const kApellido = findKey(fila, ['apellido(s)', 'apellidos', 'apellido']);

  const nombre = kNombre ? fila[kNombre] : '';
  const apellido = kApellido ? fila[kApellido] : '';

  return `${apellido || ''} ${nombre || ''}`.replace(/\s+/g, ' ').trim();
}

/** ¿La fila trae columna de apellidos? Se usa para re-formatear nombres viejos. */
export function tieneApellido(fila) {
  return Boolean(findKey(fila, ['apellido(s)', 'apellidos', 'apellido']));
}

const RE_PALABRAS_ACTIVIDAD = new RegExp(PALABRAS_ACTIVIDAD.join('|'));

/**
 * ¿La columna representa una actividad calificable?
 *
 * Se excluye "Total del curso" (no es una actividad) y se aceptan siempre las
 * columnas "(Real)", que es como Moodle marca las notas editables.
 */
export function isActivityColumn(col) {
  const c = normalizeName(col);
  if (!c) return false;
  if (c.includes('total')) return false; // "Total del curso"
  if (/\(real\)/.test(c)) return true; // columnas de nota de Moodle
  return RE_PALABRAS_ACTIVIDAD.test(c);
}
