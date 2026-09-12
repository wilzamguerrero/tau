/**
 * Parametros de la herramienta.
 *
 * Todo lo que un profesor podria querer cambiar esta aqui, en un solo
 * archivo, sin tener que buscar entre la logica.
 */

/** Escala de calificacion. Colombia usa 0.0 a 5.0. */
export const ESCALA = {
  min: 0,
  max: 5,
  paso: 0.1,
  decimales: 1,
};

/** Clave y version del estado guardado en el navegador. */
export const STORAGE_KEY = 'visor_tau_state';
export const STORAGE_VERSION = 4;

/** Nombre del archivo unico de avance (se sobrescribe, no se duplica). */
export const ARCHIVO_AVANCE = 'Avance_Notas_TAU.json';

/** Prefijo del CSV que se importa de vuelta en TAU. */
export const PREFIJO_CSV = 'Notas_Importar_TAU';

/** Limite de caracteres al previsualizar un archivo de texto. */
export const MAX_TXT_CHARS = 400_000;

/**
 * Espera antes de guardar en el navegador. Evita serializar todo el curso
 * en cada tecla mientras se escribe una nota.
 */
export const AUTOSAVE_DEBOUNCE_MS = 400;

/**
 * Palabras que identifican una columna de la planilla como actividad
 * calificable, y que tambien sirven para emparejar el nombre de una carpeta
 * con su columna ("Actividad 3" <-> "Tarea:ACTIVIDAD 3 (Real)").
 */
export const PALABRAS_ACTIVIDAD = [
  'tarea',
  'actividad',
  'taller',
  'assignment',
  'quiz',
  'examen',
  'parcial',
  'laboratorio',
  'trabajo',
  'entrega',
];

/** Campos del registro de un estudiante que NO son notas. */
export const CAMPOS_META = new Set(['nombre', 'email', 'info', 'enPlanilla']);
