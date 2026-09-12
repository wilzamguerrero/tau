/**
 * PASO 2 (primera mitad) — Leer del disco la carpeta descargada de TAU.
 *
 * Hay dos caminos, y la diferencia entre ellos es visible para el profesor:
 *
 *   A. File System Access API (Chrome/Edge): recorre la carpeta de verdad,
 *      asi que distingue "carpeta vacia" de "no entrego". Es el camino bueno.
 *   B. <input webkitdirectory> (el resto): el navegador solo entrega los
 *      archivos, nunca las carpetas vacias. Sigue sirviendo, pero se avisa.
 *
 * En ninguno de los dos se sube nada: los archivos se leen localmente.
 */

import { setStatus } from '../ui/feedback.js';
import { state } from '../core/state.js';
import { procesarEntregas } from './grid/index.js';

const AVISO_PASO_1 =
  'Carga primero el archivo Excel/CSV descargado de TAU/Moodle (Paso 1).';

/** Conecta el boton y el input de carpetas. */
export function initLoadFolders(refs) {
  // --- Camino B: input clasico ---
  refs.folderInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files ?? []);
    refs.folderInput.value = ''; // permite recargar la misma carpeta
    if (!files.length) return;

    const registros = files.map((file) => ({
      file,
      relPath: file.webkitRelativePath || file.name,
    }));
    procesarEntregas(registros, [], false);
  });

  // --- Camino A: selector de carpetas moderno ---
  refs.btnLoadFolder.addEventListener('click', async () => {
    if (!state.tauData.length) {
      alert(AVISO_PASO_1);
      return;
    }

    if (!window.showDirectoryPicker) {
      refs.folderInput.click(); // navegador sin File System Access API
      return;
    }

    let raiz;
    try {
      raiz = await window.showDirectoryPicker({ mode: 'read' });
    } catch (err) {
      if (err?.name === 'AbortError') return; // el profesor cancelo
      refs.folderInput.click(); // permiso denegado: se usa el camino B
      return;
    }

    setStatus('loader', 'Leyendo carpetas y archivos…');

    const salida = { records: [], emptyDirs: [] };
    try {
      await walkDir(raiz, raiz.name, salida);
    } catch (err) {
      console.error('No se pudo recorrer la carpeta', err);
      alert('No se pudo leer la carpeta seleccionada.');
      setStatus('alert-triangle', 'No se pudo leer la carpeta.', 'bad');
      return;
    }

    procesarEntregas(salida.records, salida.emptyDirs, true);
  });
}

/**
 * Recorre un directorio y sus subdirectorios.
 *
 * Devuelve cuantos archivos encontro, y de paso anota las carpetas que no
 * tienen ninguno: eso es lo que permite distinguir la carpeta vacia del
 * estudiante que no entrego.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} ruta
 * @param {{records: {file: File, relPath: string}[], emptyDirs: string[]}} salida
 * @returns {Promise<number>}
 */
export async function walkDir(dirHandle, ruta, salida) {
  let cuenta = 0;

  for await (const entrada of dirHandle.values()) {
    const hija = `${ruta}/${entrada.name}`;

    if (entrada.kind === 'file') {
      try {
        salida.records.push({ file: await entrada.getFile(), relPath: hija });
        cuenta += 1;
      } catch {
        // Archivo bloqueado o abierto en otro programa: se ignora en vez de
        // abortar el recorrido completo del curso.
      }
    } else {
      cuenta += await walkDir(entrada, hija, salida);
    }
  }

  if (cuenta === 0) salida.emptyDirs.push(ruta);
  return cuenta;
}
