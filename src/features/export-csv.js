/**
 * PASO 4 — Exportar el CSV que se vuelve a importar en TAU.
 *
 * Aqui hay un riesgo real y es la razon de que este paso pregunte antes de
 * actuar: TAU importa el archivo tal cual, asi que una actividad exportada
 * con 0,0 para todos BORRA en la plataforma lo que ya estuviera subido.
 *
 * Por eso, si una actividad no tiene ni una sola nota registrada en la
 * herramienta, se ofrece dejarla intacta en vez de exportarla en ceros.
 *
 * Las columnas que no son actividades se copian sin tocar, para que el
 * archivo siga teniendo la forma que TAU espera.
 */

import { PREFIJO_CSV } from '../config.js';
import { descargar } from '../ui/dom.js';
import { setStatus } from '../ui/feedback.js';
import { getEmail } from '../core/spreadsheet.js';
import { tituloActividad } from '../core/text.js';
import { esNotaValida, formatNotaCSV, parseNota } from '../core/grades.js';
import { state } from '../core/state.js';
import { cargarXLSX } from '../vendor/lazy.js';

/** Conecta el boton de exportacion. */
export function initExportCsv(refs) {
  refs.btnExportTAU.addEventListener('click', exportarCsv);
}

export async function exportarCsv() {
  if (!state.tauData.length) {
    alert('No hay datos para exportar. Carga primero la planilla de TAU.');
    return;
  }

  const excluidas = preguntarPorActividadesVacias();
  if (excluidas === null) return; // se cancelo el cuadro de dialogo del sistema

  const columnas = state.actividadesDetectadas.filter(
    (a) => !excluidas.includes(a),
  );

  if (!columnas.length) {
    setStatus(
      'alert-triangle',
      'No se exportó ninguna actividad: todas quedaron protegidas.',
      'warn',
    );
    return;
  }

  setStatus('loader', 'Generando el CSV…');

  const XLSX = await cargarXLSX();
  const filas = state.tauData.map((fila) => construirFila(fila, columnas));
  const hoja = XLSX.utils.json_to_sheet(filas);
  const csv = XLSX.utils.sheet_to_csv(hoja, { FS: ',' });

  // El BOM es lo que hace que Excel y TAU lean bien las tildes y las enes.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const fecha = new Date().toISOString().slice(0, 10);
  descargar(blob, `${PREFIJO_CSV}_${fecha}.csv`);

  informar(columnas, excluidas);
}

/**
 * Una actividad sin ninguna nota registrada se exportaria como 0,0 para
 * todos. Se avisa y se deja elegir.
 *
 * @returns {string[]|null} actividades a dejar intactas
 */
function preguntarPorActividadesVacias() {
  const vacias = state.actividadesDetectadas.filter(
    (act) =>
      !Object.values(state.notasGlobales).some(
        (est) => parseNota(est[act]) !== null,
      ),
  );
  if (!vacias.length) return [];

  const lista = vacias.map((a) => `• ${tituloActividad(a)}`).join('\n');
  const proteger = confirm(
    'Estas actividades no tienen ninguna nota registrada en la ' +
      'herramienta:\n\n' +
      lista +
      '\n\nACEPTAR = no tocarlas (se exporta el valor que ya traía la ' +
      'planilla).\n\nCANCELAR = exportarlas con 0,0 para todos los ' +
      'estudiantes.',
  );

  return proteger ? vacias : [];
}

/** Copia la fila de la planilla y reemplaza solo las columnas exportables. */
function construirFila(fila, columnas) {
  const est = state.notasGlobales[getEmail(fila)] ?? {};
  const copia = { ...fila };

  for (const act of columnas) {
    copia[act] = esNotaValida(est[act]) ? formatNotaCSV(est[act]) : '0,0';
  }

  return copia;
}

function informar(columnas, excluidas) {
  const nombres = (lista) => lista.map(tituloActividad).join(' · ') || '—';

  setStatus(
    'file-down',
    `CSV generado con ${columnas.length} actividad(es): ${nombres(columnas)}` +
      (excluidas.length
        ? ` · se dejaron intactas: ${nombres(excluidas)}.`
        : '.'),
    'ok',
  );
}
