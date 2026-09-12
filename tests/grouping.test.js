import { beforeEach, describe, expect, it } from 'vitest';

import {
  agrupar,
  columnForActivitySeg,
  locateSegs,
  segIsStudent,
} from '../src/features/grid/grouping.js';
import { resetState, state } from '../src/core/state.js';

/** Un archivo de mentira: solo hace falta el nombre para agrupar. */
const archivo = (nombre) => ({ name: nombre });

describe('segIsStudent', () => {
  it('reconoce las carpetas de Moodle', () => {
    expect(segIsStudent('Ana Gómez_123456_assignsubmission_file_')).toBe(true);
    expect(segIsStudent('Ana Gómez_123456_')).toBe(true);
    expect(segIsStudent('Ana Gómez_123456')).toBe(true);
  });

  it('no confunde una carpeta de actividad', () => {
    expect(segIsStudent('ACTIVIDAD 1')).toBe(false);
    expect(segIsStudent('Entregas del curso')).toBe(false);
  });
});

describe('locateSegs', () => {
  it('ubica estudiante y actividad en la ruta de Moodle', () => {
    const partes = [
      'Entregas',
      'ACTIVIDAD 1',
      'Ana Gómez_123_assignsubmission_file_',
      'informe.pdf',
    ];
    expect(locateSegs(partes)).toEqual({
      studentSeg: 'Ana Gómez_123_assignsubmission_file_',
      activitySeg: 'ACTIVIDAD 1',
    });
  });

  it('usa la convencion habitual cuando no hay marca de Moodle', () => {
    // Carpetas renombradas a mano: el penultimo segmento es el estudiante.
    expect(locateSegs(['ACTIVIDAD 2', 'Ana Gómez', 'trabajo.docx'])).toEqual({
      studentSeg: 'Ana Gómez',
      activitySeg: 'ACTIVIDAD 2',
    });
  });

  it('no se rompe con un archivo en la raiz', () => {
    const r = locateSegs(['suelto.pdf']);
    expect(r.studentSeg).toBe('suelto.pdf');
    expect(r.activitySeg).toBe('suelto.pdf');
  });
});

describe('agrupar', () => {
  it('junta los archivos de un mismo estudiante', () => {
    const { grupos } = agrupar(
      [
        {
          file: archivo('a.pdf'),
          relPath: 'X/ACTIVIDAD 1/Ana_1_assignsubmission_file_/a.pdf',
        },
        {
          file: archivo('b.pdf'),
          relPath: 'X/ACTIVIDAD 1/Ana_1_assignsubmission_file_/b.pdf',
        },
      ],
      [],
    );

    expect(grupos).toHaveLength(1);
    expect(grupos[0].files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('separa al mismo estudiante en actividades distintas', () => {
    const { grupos } = agrupar(
      [
        { file: archivo('a.pdf'), relPath: 'X/ACTIVIDAD 1/Ana_1_/a.pdf' },
        { file: archivo('b.pdf'), relPath: 'X/ACTIVIDAD 2/Ana_1_/b.pdf' },
      ],
      [],
    );
    expect(grupos).toHaveLength(2);
  });

  it('crea un grupo vacio para la carpeta del estudiante sin archivos', () => {
    // Es lo que distingue "subio la carpeta vacia" de "no entrego", y el
    // profesor necesita ver la diferencia antes de poner 0.
    const { grupos } = agrupar([], ['ACTIVIDAD 1/Ana_1_assignsubmission_file_']);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].files).toEqual([]);
    expect(grupos[0].activitySeg).toBe('ACTIVIDAD 1');
  });

  it('anota la actividad en la que nadie entrego', () => {
    const { grupos, actividadesVacias } = agrupar([], ['Entregas/ACTIVIDAD 3']);
    expect(grupos).toEqual([]);
    expect(actividadesVacias).toEqual(['ACTIVIDAD 3']);
  });

  it('ignora la carpeta raiz vacia', () => {
    const { grupos, actividadesVacias } = agrupar([], ['Entregas']);
    expect(grupos).toEqual([]);
    expect(actividadesVacias).toEqual([]);
  });
});

describe('columnForActivitySeg', () => {
  beforeEach(() => {
    resetState();
    state.actividadesDetectadas = [
      'Tarea:Actividad 1 (Real)',
      'Tarea:Actividad 2 (Real)',
    ];
  });

  it('empareja la carpeta con su columna por el numero', () => {
    expect(columnForActivitySeg('ACTIVIDAD 2')).toBe('Tarea:Actividad 2 (Real)');
  });

  it('cae en la primera actividad si la carpeta no dice cual es', () => {
    expect(columnForActivitySeg('Entregas sueltas')).toBe(
      'Tarea:Actividad 1 (Real)',
    );
  });

  it('usa el nombre de la carpeta si la planilla no tiene actividades', () => {
    state.actividadesDetectadas = [];
    expect(columnForActivitySeg('ACTIVIDAD 9')).toBe('ACTIVIDAD 9');
  });
});
