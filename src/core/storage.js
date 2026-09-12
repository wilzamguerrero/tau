/**
 * Persistencia en el navegador (localStorage).
 *
 * Es la red de seguridad contra un cierre accidental de la pestana: el
 * respaldo "de verdad", el que el profesor archiva, es el .json de avance.
 *
 * Dos decisiones que importan:
 *
 * 1. Se guarda con retardo (debounce). Escribir una nota disparaba una
 *    serializacion completa del curso en cada tecla.
 * 2. No se guarda `est.info` (la fila cruda de la planilla). Esa fila ya
 *    viaja en `tauData`, y duplicarla por estudiante era lo que hacia
 *    reventar la cuota de 5 MB en cursos grandes. Al cargar se vuelve a
 *    enlazar por correo.
 */

import {
  AUTOSAVE_DEBOUNCE_MS,
  CAMPOS_META,
  STORAGE_KEY,
  STORAGE_VERSION,
} from '../config.js';
import { refrescarDerivados, state } from './state.js';
import { getEmail } from './spreadsheet.js';

/** @type {((mensaje: string) => void)|null} */
let manejadorError = null;

/** Registra a quien avisarle si el navegador se niega a guardar. */
export function onStorageError(fn) {
  manejadorError = fn;
}

/** Estado serializable, sin las filas crudas duplicadas. */
function serializar() {
  const notas = {};
  for (const [email, est] of Object.entries(state.notasGlobales)) {
    const copia = {};
    for (const [k, v] of Object.entries(est)) {
      if (k === 'info') continue; // se reconstruye desde tauData
      copia[k] = v;
    }
    notas[email] = copia;
  }

  return {
    version: STORAGE_VERSION,
    fecha: new Date().toISOString(),
    tauData: state.tauData,
    tauColumns: state.tauColumns,
    actividadesDetectadas: state.actividadesDetectadas,
    actividadesConocidas: state.actividadesConocidas,
    notasGlobales: notas,
  };
}

let timer = null;

/** Guarda con retardo: agrupa muchas ediciones seguidas en una escritura. */
export function saveLocalState() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    saveLocalStateNow();
  }, AUTOSAVE_DEBOUNCE_MS);
}

/** Guarda de inmediato (al cerrar la pestana, o antes de una accion grande). */
export function saveLocalStateNow() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializar()));
    return true;
  } catch (err) {
    console.warn('No se pudo guardar en el navegador', err);
    manejadorError?.(
      'SIN RESPALDO AUTOMATICO — el navegador no permitio guardar la copia ' +
        'local (puede estar llena o en modo privado). Usa "Guardar avance" ' +
        'para conservar el trabajo en un archivo .json.',
    );
    return false;
  }
}

/**
 * Recupera el estado guardado y lo aplica.
 * @returns {boolean} true si habia algo que restaurar
 */
export function loadLocalState() {
  let crudo;
  try {
    crudo = localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!crudo) return false;

  let guardado;
  try {
    guardado = JSON.parse(crudo);
  } catch (err) {
    console.error('El estado guardado no es JSON valido', err);
    return false;
  }
  if (!guardado || typeof guardado !== 'object') return false;

  aplicarEstado(guardado);
  return Object.keys(state.notasGlobales).length > 0;
}

/**
 * Vuelca un estado (del navegador o de un .json) sobre el estado actual,
 * reemplazandolo, y re-enlaza las filas crudas por correo.
 */
export function aplicarEstado(guardado) {
  state.tauData = guardado.tauData || [];
  state.tauColumns = guardado.tauColumns || [];
  state.actividadesDetectadas = guardado.actividadesDetectadas || [];
  state.notasGlobales = guardado.notasGlobales || {};
  reenlazarInfo();
  refrescarDerivados();
}

/**
 * Devuelve a cada estudiante su fila de la planilla. Solo sirve para
 * re-formatear el nombre como "Apellidos Nombres"; un estudiante que ya no
 * figura en la planilla se queda sin `info` y conserva el nombre guardado.
 */
export function reenlazarInfo() {
  const porEmail = new Map();
  for (const fila of state.tauData) {
    const email = getEmail(fila);
    if (email) porEmail.set(email, fila);
  }
  for (const [email, est] of Object.entries(state.notasGlobales)) {
    if (!est.info && porEmail.has(email)) est.info = porEmail.get(email);
  }
}

/** Borra la copia local. */
export function clearLocalState() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada que hacer */
  }
}

/** Estado completo para el archivo .json de avance (este si lleva `info`). */
export function estadoParaArchivo() {
  return {
    version: STORAGE_VERSION,
    fecha: new Date().toISOString(),
    tauData: state.tauData,
    tauColumns: state.tauColumns,
    actividadesDetectadas: state.actividadesDetectadas,
    actividadesConocidas: state.actividadesConocidas,
    notasGlobales: state.notasGlobales,
  };
}

/** Campos que no son notas, expuesto para quien recorra un respaldo externo. */
export { CAMPOS_META };
