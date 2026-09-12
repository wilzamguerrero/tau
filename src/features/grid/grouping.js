/**
 * De una lista plana de archivos a grupos (actividad, estudiante).
 *
 * Moodle entrega una jerarquia asi:
 *
 *   ACTIVIDAD 1/
 *     Juan Perez_123456_assignsubmission_file_/
 *       informe.pdf
 *
 * pero el navegador solo entrega rutas relativas sueltas. Aqui se reconstruye
 * quien entrego que, sin depender de la profundidad exacta de la carpeta que
 * el profesor haya seleccionado.
 */

import { activityKey } from '../../core/text.js';
import { state } from '../../core/state.js';

/** ¿Este segmento de ruta parece la carpeta de un estudiante? */
export function segIsStudent(seg) {
  return /_\d+_assignsubmission/i.test(seg) || /_\d+_?$/.test(seg);
}

/**
 * Ubica en una ruta el segmento del estudiante y el de la actividad.
 *
 * `parts` incluye el nombre del archivo al final. Si ningun segmento tiene
 * la marca de Moodle se asume la convencion habitual: el penultimo segmento
 * es el estudiante y el anterior la actividad.
 */
export function locateSegs(parts) {
  let si = -1;
  for (let i = 0; i < parts.length - 1; i++) {
    if (segIsStudent(parts[i])) {
      si = i;
      break;
    }
  }
  if (si < 0) si = Math.max(0, parts.length - 2);

  return {
    studentSeg: parts[si] || parts[0],
    activitySeg: si > 0 ? parts[si - 1] : parts[0] || 'Actividad',
  };
}

/**
 * @typedef {{file: File, relPath: string}} Registro
 * @typedef {{activitySeg: string, studentSeg: string, files: File[]}} Grupo
 */

/**
 * Agrupa los archivos por (actividad, estudiante).
 *
 * @param {Registro[]} registros
 * @param {string[]} carpetasVacias rutas de carpetas sin ningun archivo
 * @returns {{grupos: Grupo[], actividadesVacias: string[]}}
 */
export function agrupar(registros, carpetasVacias) {
  /** @type {Record<string, Grupo>} */
  const grupos = {};

  for (const reg of registros) {
    const parts = (reg.relPath || '').split('/').filter(Boolean);
    const { studentSeg, activitySeg } = locateSegs(parts);
    const clave = `${activitySeg} || ${studentSeg}`;
    (grupos[clave] ??= { activitySeg, studentSeg, files: [] }).files.push(
      reg.file,
    );
  }

  // Carpetas vacias: solo llegan cuando se uso el selector moderno, que si
  // las reporta. Distinguen "carpeta vacia" de "no entrego", que para el
  // profesor no es lo mismo aunque la nota acabe siendo la misma.
  const actividadesVacias = [];
  for (const ruta of carpetasVacias ?? []) {
    const parts = ruta.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    const ultimo = parts[parts.length - 1];
    if (segIsStudent(ultimo)) {
      const activitySeg = parts[parts.length - 2];
      const clave = `${activitySeg} || ${ultimo}`;
      grupos[clave] ??= { activitySeg, studentSeg: ultimo, files: [] };
    } else if (parts.length === 2) {
      actividadesVacias.push(ultimo); // actividad sin ninguna entrega
    }
  }

  return { grupos: Object.values(grupos), actividadesVacias };
}

/**
 * Columna de nota que corresponde a una carpeta de actividad.
 * "ACTIVIDAD 3" se empareja con "Tarea:Actividad 3 (Real)" por su numero.
 */
export function columnForActivitySeg(activitySeg) {
  const k = activityKey(activitySeg);
  if (k) {
    const hallada = state.actividadesDetectadas.find(
      (col) => activityKey(col) === k,
    );
    if (hallada) return hallada;
  }
  return state.actividadesDetectadas[0] || activitySeg;
}
