/**
 * Notas: interpretacion, validacion y formato.
 *
 * La escala vive en config.js (0.0 a 5.0 por defecto), asi que un curso con
 * otra escala solo necesita cambiar ese archivo.
 */

import { ESCALA } from '../config.js';

/**
 * Convierte "4,5" / "4.5" / 3 en numero.
 * Devuelve null si no es una nota valida (vacio, '-', texto).
 */
export function parseNota(v) {
  if (v === undefined || v === null) return null;
  const s = v.toString().trim().replace(',', '.');
  if (!s || s === '-') return null;
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/**
 * Ajusta una nota a la escala configurada.
 * @returns {{valor:number, recortada:boolean}}
 */
export function clampNota(n) {
  if (n < ESCALA.min) return { valor: ESCALA.min, recortada: true };
  if (n > ESCALA.max) return { valor: ESCALA.max, recortada: true };
  return { valor: n, recortada: false };
}

/** ¿El valor guardado es una nota utilizable? */
export function esNotaValida(v) {
  return v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v));
}

/** "4.5" para mostrar en pantalla. */
export function formatNota(n) {
  return Number(n).toFixed(ESCALA.decimales);
}

/** "4,5" para el CSV que entiende TAU (separador decimal de coma). */
export function formatNotaCSV(n) {
  return formatNota(n).replace('.', ',');
}

/**
 * Promedio sobre una lista de actividades. Una actividad sin nota cuenta
 * como 0.0: es la regla del curso y es lo que se exporta a TAU.
 */
export function promedio(estudiante, actividades) {
  if (!actividades.length) return 0;
  const suma = actividades.reduce((acc, act) => {
    const v = estudiante?.[act];
    return acc + (esNotaValida(v) ? Number(v) : 0);
  }, 0);
  return suma / actividades.length;
}
