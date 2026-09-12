/**
 * La tarjeta de una entrega.
 *
 * Es la unidad de trabajo del profesor: a quien pertenece, con cuanta
 * confianza se emparejo, su nota, y la entrega misma para poder revisarla
 * sin salir de la pagina.
 *
 * Se construye en tres modos:
 *   - `entrega`     hay carpeta con archivos
 *   - `vacia`       la carpeta existe pero no tiene nada dentro
 *   - `sinCarpeta`  el estudiante no entrego
 *
 * La diferencia entre los dos ultimos importa: una carpeta vacia suele ser
 * un error al subir el archivo, y merece que el profesor lo mire antes de
 * poner 0.
 */

import { ESCALA } from '../../config.js';
import { agregar, el, humanSize, vaciar } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { setStatus } from '../../ui/feedback.js';
import {
  activityKey,
  normalizeName,
  studentNameFromFolder,
  tituloActividad,
} from '../../core/text.js';
import { clampNota, parseNota } from '../../core/grades.js';
import { state } from '../../core/state.js';
import { saveLocalState } from '../../core/storage.js';
import { iconForName } from '../../preview/types.js';
import { renderPreview } from '../../preview/index.js';
import { registrarSinEntrega } from './pending.js';

/** Etiquetas del distintivo de emparejamiento. */
const CHIPS = {
  exact: ['match-exact', 'check', 'Emparejado'],
  fuzzy: ['match-fuzzy', 'alert-triangle', 'Aprox. — verifica'],
  dup: ['match-dup', 'users', 'Nombre duplicado'],
  none: ['match-none', 'x', 'Sin emparejar'],
  manual: ['match-manual', 'sparkles', 'Asignado manual'],
  vacia: ['match-empty', 'folder-x', 'Carpeta sin archivos'],
  sinCarpeta: ['match-missing', 'ban', 'No entregó'],
};

let contadorCampos = 0;

/**
 * @param {object} opciones
 * @param {string} opciones.activitySeg  carpeta de la actividad
 * @param {string} opciones.activityCol  columna de nota de la planilla
 * @param {string} opciones.studentSeg   carpeta del estudiante
 * @param {File[]} opciones.files
 * @param {string|null} opciones.assignedEmail
 * @param {'exact'|'fuzzy'|'dup'|'none'} opciones.matchStatus
 * @param {'entrega'|'vacia'|'sinCarpeta'} opciones.modo
 * @param {{email:string, nombre:string}[]} opciones.estudiantes para el selector
 * @returns {HTMLElement}
 */
export function construirTarjeta({
  activitySeg,
  activityCol,
  studentSeg,
  files,
  assignedEmail,
  matchStatus,
  modo,
  estudiantes,
}) {
  // Puede cambiar si el profesor reasigna la entrega a mano.
  let email = assignedEmail;

  const nombreCarpeta = studentNameFromFolder(studentSeg || '');
  const nombreMostrado = () =>
    email ? state.notasGlobales[email].nombre : nombreCarpeta;

  const titulo = el('div', { class: 'student-title', text: nombreMostrado() });
  const chip = el('span', { class: 'match-chip' });
  const { campo: inputNota, cargar: cargarNota } = campoNota();
  const cuerpo = el('div', { class: 'card-body' });

  const tarjeta = el('div', {
    class: clasesTarjeta(modo),
    dataset: {
      modo,
      name: normalizeName(`${nombreMostrado()} ${nombreCarpeta}`),
    },
  });

  pintarChip(modo === 'entrega' ? matchStatus : modo);

  agregar(tarjeta, [
    encabezado(),
    modo !== 'sinCarpeta' && filaAsignacion(),
    cuerpo,
  ]);

  llenarCuerpo();
  return tarjeta;

  // -------------------------------------------------------------------------

  function encabezado() {
    return el('div', { class: 'card-header' }, [
      el('div', { class: 'header-left' }, [
        el('div', { class: 'title-row' }, [
          el('span', {
            class: 'activity-chip',
            text: (
              activityKey(activitySeg) || tituloActividad(activityCol)
            ).toUpperCase(),
          }),
          titulo,
        ]),
        chip,
      ]),
      el('div', { class: 'grade-input-container' }, [
        el('label', { text: 'Nota:', htmlFor: inputNota.id }),
        inputNota,
      ]),
    ]);
  }

  function pintarChip(estado) {
    const [cls, ico, txt] = CHIPS[estado] ?? CHIPS.none;
    chip.className = `match-chip ${cls}`;
    vaciar(chip);
    chip.append(icon(ico), el('span', { text: txt }));
  }

  /** El campo de nota, con su lectura y escritura sobre el estado. */
  function campoNota() {
    contadorCampos += 1;
    const campo = el('input', {
      type: 'number',
      step: String(ESCALA.paso),
      min: String(ESCALA.min),
      max: String(ESCALA.max),
      class: 'grade-input',
      id: `nota-${contadorCampos}`,
      attrs: { 'aria-label': 'Nota de la actividad' },
      on: { input: escribir, blur: normalizar },
    });

    function cargar() {
      const guardada = email
        ? state.notasGlobales[email][activityCol]
        : undefined;
      campo.value = guardada === undefined ? '' : guardada;
      campo.classList.remove('grade-clamped');
    }

    function escribir() {
      if (!email) {
        setStatus(
          'alert-triangle',
          'Esta entrega no está asignada a ningún estudiante. Usa el ' +
            'selector "Asignar a" antes de calificar.',
          'warn',
        );
        return;
      }

      const n = parseNota(campo.value);
      if (n === null) {
        delete state.notasGlobales[email][activityCol];
        campo.classList.remove('grade-clamped');
      } else {
        // Un 45 por "4.5" no puede quedar guardado: se ajusta a la escala y
        // se marca el campo, para que se vea que la nota guardada no es la
        // que se tecleo.
        const { valor, recortada } = clampNota(n);
        state.notasGlobales[email][activityCol] = valor;
        campo.classList.toggle('grade-clamped', recortada);
      }
      saveLocalState();
    }

    // Al salir del campo se muestra el valor ya ajustado, para que lo que se
    // ve sea exactamente lo que se va a exportar.
    function normalizar() {
      if (!email) return;
      const guardada = state.notasGlobales[email][activityCol];
      if (guardada !== undefined && String(guardada) !== campo.value) {
        campo.value = guardada;
      }
    }

    cargar();
    return { campo, cargar };
  }

  /** Selector para corregir a mano un emparejamiento dudoso. */
  function filaAsignacion() {
    const selector = el(
      'select',
      {
        class: 'assign-select',
        attrs: { 'aria-label': 'Asignar esta entrega a un estudiante' },
        on: {
          change() {
            email = selector.value || null;
            titulo.textContent = nombreMostrado();
            pintarChip(email ? 'manual' : 'none');
            cargarNota();
            tarjeta.dataset.name = normalizeName(
              `${email ? state.notasGlobales[email].nombre : ''} ${nombreCarpeta}`,
            );
          },
        },
      },
      [
        el('option', { value: '', text: '— Sin asignar —' }),
        ...estudiantes.map((s) =>
          el('option', {
            value: s.email,
            text: `${s.nombre}  <${s.email}>`,
            selected: s.email === email,
          }),
        ),
      ],
    );

    return el('div', { class: 'assign-row' }, [
      el('label', { text: 'Asignar a:' }),
      selector,
    ]);
  }

  function llenarCuerpo() {
    if (modo === 'sinCarpeta') {
      cuerpo.append(
        bloqueSinEntrega({
          clase: 'missing-note',
          iconName: 'folder-x',
          rotulo: 'No existe la carpeta',
          detalle:
            'El estudiante no tiene carpeta de entrega en esta actividad ' +
            '(no entregó).<br>Puedes colocarle la nota igual en el campo ' +
            'de arriba.',
        }),
      );
      return;
    }

    if (!files.length) {
      cuerpo.append(
        bloqueSinEntrega({
          clase: 'empty-note',
          iconName: 'file-x',
          rotulo: 'No hay archivo',
          detalle:
            'La carpeta del estudiante <strong>sí existe</strong>, pero ' +
            'está vacía.<br>Puedes colocarle la nota igual en el campo de ' +
            'arriba.',
        }),
      );
      return;
    }

    cuerpo.append(
      el('div', { class: 'files-count' }, [
        icon('layout-grid'),
        el('span', { text: `${files.length} archivo(s) en la carpeta` }),
      ]),
    );

    for (const file of files) {
      const destino = el('div', { class: 'file-container' });
      cuerpo.append(
        el('div', { class: 'file-name' }, [
          icon(iconForName(file.name)),
          el('span', { text: file.name }),
          el('span', { class: 'file-size', text: humanSize(file.size) }),
        ]),
        destino,
      );
      // Sin await: las previsualizaciones se van llenando solas y la
      // cuadricula aparece de inmediato.
      renderPreview(file, file.name, destino);
    }
  }

  function bloqueSinEntrega({ clase, iconName, rotulo, detalle }) {
    // Solo cuenta para "poner 0 a todos" si se sabe a quien pertenece.
    if (email) registrarSinEntrega(inputNota);

    return el('div', { class: clase }, [
      el('div', { class: 'missing-icon ico-xl' }, [icon(iconName)]),
      el('div', { class: 'missing-title', text: rotulo }),
      el('div', { class: 'missing-sub', html: detalle }),
      el(
        'button',
        {
          class: 'btn btn-bad btn-sm',
          type: 'button',
          on: {
            click() {
              inputNota.value = String(ESCALA.min);
              inputNota.dispatchEvent(new Event('input'));
            },
          },
        },
        [icon('circle-slash'), el('span', { text: 'Colocar 0.0' })],
      ),
    ]);
  }
}

function clasesTarjeta(modo) {
  const clases = ['card'];
  if (modo !== 'entrega') clases.push('card-flat');
  if (modo === 'sinCarpeta') clases.push('card-missing');
  if (modo === 'vacia') clases.push('card-empty');
  return clases.join(' ');
}
