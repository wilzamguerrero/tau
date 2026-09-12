import { beforeEach, describe, expect, it } from 'vitest';

import { matchFolderToEmail } from '../src/core/matching.js';
import {
  columnaEquivalente,
  refrescarActividadesConocidas,
  rebuildNameIndex,
  resetState,
  state,
} from '../src/core/state.js';

/** Carga una planilla de prueba en el estado. */
function sembrar(estudiantes, actividades = []) {
  resetState();
  state.actividadesDetectadas = actividades;
  for (const [email, nombre] of Object.entries(estudiantes)) {
    state.notasGlobales[email] = { nombre, email };
  }
  rebuildNameIndex();
  refrescarActividadesConocidas();
}

describe('matchFolderToEmail', () => {
  beforeEach(() => {
    sembrar({
      'ana@u.co': 'Gómez Ruiz Ana María',
      'juan@u.co': 'Pérez Muñoz Juan Carlos',
      'luis@u.co': 'Torres Luis',
    });
  });

  it('empareja la carpeta de Moodle con la planilla', () => {
    // La carpeta dice "Nombres Apellidos"; la planilla, "Apellidos Nombres".
    const m = matchFolderToEmail(
      'Ana María Gómez Ruiz_123456_assignsubmission_file_',
    );
    expect(m).toEqual({ email: 'ana@u.co', status: 'exact' });
  });

  it('empareja sin tildes ni mayusculas', () => {
    const m = matchFolderToEmail('JUAN CARLOS PEREZ MUNOZ_9_');
    expect(m).toEqual({ email: 'juan@u.co', status: 'exact' });
  });

  it('marca como aproximado un nombre incompleto', () => {
    // La carpeta trae dos de los cuatro nombres: alcanza, pero se avisa.
    const m = matchFolderToEmail('Ana Gómez_555_');
    expect(m.email).toBe('ana@u.co');
    expect(m.status).toBe('fuzzy');
  });

  it('no adivina con un solo nombre', () => {
    // "Ana" sola podria ser cualquiera: mejor sin emparejar que mal asignada.
    expect(matchFolderToEmail('Ana_1_')).toEqual({
      email: null,
      status: 'none',
    });
  });

  it('no empareja a quien no esta en la planilla', () => {
    expect(matchFolderToEmail('Pedro Ramírez Soto_2_')).toEqual({
      email: null,
      status: 'none',
    });
  });

  it('avisa cuando dos estudiantes tienen el mismo nombre', () => {
    sembrar({
      'ana1@u.co': 'Gómez Ana',
      'ana2@u.co': 'Gómez Ana',
    });
    const m = matchFolderToEmail('Ana Gómez_1_');
    expect(m.status).toBe('dup');
    expect(m.email).toBe('ana1@u.co');
  });

  it('no se queda con un resultado viejo al cambiar de planilla', () => {
    // La cache acelera la cuadricula; si no se invalidara, cargar otro curso
    // seguiria calificando a los estudiantes del anterior.
    const carpeta = 'Ana María Gómez Ruiz_123456_assignsubmission_file_';
    expect(matchFolderToEmail(carpeta).email).toBe('ana@u.co');

    sembrar({ 'otra@u.co': 'Gómez Ruiz Ana María' });
    expect(matchFolderToEmail(carpeta).email).toBe('otra@u.co');
  });
});

describe('refrescarActividadesConocidas', () => {
  it('conserva las actividades que ya tienen notas', () => {
    // Una actividad calificada en un ciclo anterior no puede desaparecer del
    // consolidado solo porque la planilla nueva no la trae.
    sembrar({ 'ana@u.co': 'Gómez Ana' }, ['Tarea:Actividad 2']);
    state.notasGlobales['ana@u.co']['Tarea:Actividad 1'] = 4;
    refrescarActividadesConocidas();

    expect(state.actividadesConocidas).toEqual([
      'Tarea:Actividad 1',
      'Tarea:Actividad 2',
    ]);
  });

  it('ordena por numero de actividad, no alfabeticamente', () => {
    sembrar({}, [
      'Tarea:Actividad 10',
      'Tarea:Actividad 2',
      'Tarea:Actividad 1',
    ]);
    expect(state.actividadesConocidas).toEqual([
      'Tarea:Actividad 1',
      'Tarea:Actividad 2',
      'Tarea:Actividad 10',
    ]);
  });
});

describe('columnaEquivalente', () => {
  beforeEach(() => {
    sembrar({}, ['Tarea:Actividad 1 (Real)', 'Tarea:Actividad 2 (Real)']);
  });

  it('traduce el encabezado viejo al nuevo', () => {
    expect(columnaEquivalente('Tarea:ACTIVIDAD 1')).toBe(
      'Tarea:Actividad 1 (Real)',
    );
  });

  it('deja la columna igual si ya es la actual', () => {
    expect(columnaEquivalente('Tarea:Actividad 2 (Real)')).toBe(
      'Tarea:Actividad 2 (Real)',
    );
  });

  it('no mueve la nota cuando hay ambiguedad', () => {
    // Dos candidatas para la misma actividad: mejor una columna de mas que
    // una nota en la actividad equivocada.
    sembrar({}, ['Tarea:Actividad 1 (Real)', 'Taller:Actividad 1']);
    expect(columnaEquivalente('Actividad 1 antigua')).toBe(
      'Actividad 1 antigua',
    );
  });

  it('deja igual una columna sin actividad reconocible', () => {
    expect(columnaEquivalente('Observaciones')).toBe('Observaciones');
  });
});
