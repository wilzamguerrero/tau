import { describe, expect, it } from 'vitest';

import {
  activityKey,
  nameKey,
  nameTokens,
  normalizeName,
  studentNameFromFolder,
  tituloActividad,
} from '../src/core/text.js';

describe('normalizeName', () => {
  it('quita tildes, dieresis y enes', () => {
    expect(normalizeName('MUÑOZ Peña Güío')).toBe('munoz pena guio');
  });

  it('colapsa los espacios de sobra', () => {
    expect(normalizeName('  Ana   María   Gómez ')).toBe('ana maria gomez');
  });

  it('tolera valores vacios', () => {
    expect(normalizeName(undefined)).toBe('');
    expect(normalizeName(null)).toBe('');
  });
});

describe('nameTokens', () => {
  it('separa por signos, no solo por espacios', () => {
    // Moodle y TAU escriben el mismo apellido compuesto de formas distintas.
    expect(nameTokens('Gómez-Ruiz, Ana María')).toEqual([
      'gomez',
      'ruiz',
      'ana',
      'maria',
    ]);
  });

  it('no devuelve trozos vacios', () => {
    expect(nameTokens('  ,,  ')).toEqual([]);
    expect(nameTokens(null)).toEqual([]);
  });
});

describe('nameKey', () => {
  it('no depende del orden de los nombres', () => {
    // Es la razon de ser de la clave: TAU lista "Apellidos Nombres" y
    // Moodle nombra las carpetas "Nombres Apellidos".
    expect(nameKey('Gómez Ruiz Ana María')).toBe(nameKey('Ana María Gómez Ruiz'));
  });

  it('empareja el apellido compuesto escrito de dos formas', () => {
    // La carpeta viene "Ana María Gómez-Ruiz" y la planilla "Gómez Ruiz Ana María".
    expect(nameKey('Gómez-Ruiz, Ana María')).toBe(nameKey('Gómez Ruiz Ana María'));
  });

  it('distingue a dos personas distintas', () => {
    expect(nameKey('Ana Gómez')).not.toBe(nameKey('Ana Gómez Ruiz'));
  });
});

describe('activityKey', () => {
  it('reconoce la misma actividad con encabezados distintos', () => {
    // El caso real que hacia perder notas al recargar la planilla.
    expect(activityKey('Tarea:ACTIVIDAD 1')).toBe(
      activityKey('Tarea:Actividad 1 (Real)'),
    );
  });

  it('no confunde dos actividades numeradas', () => {
    expect(activityKey('Tarea:Actividad 1')).not.toBe(
      activityKey('Tarea:Actividad 2'),
    );
  });

  it('se queda con el ultimo numero del encabezado', () => {
    // "Tarea 2: Actividad 5" es la actividad 5, no la tarea 2.
    expect(activityKey('Tarea 2: Actividad 5')).toBe(activityKey('Actividad 5'));
  });

  it('empareja la carpeta del disco con la columna de la planilla', () => {
    expect(activityKey('ACTIVIDAD 3')).toBe(
      activityKey('Tarea:Actividad 3 (Real)'),
    );
  });

  it('devuelve vacio cuando no hay actividad reconocible', () => {
    expect(activityKey('Correo electrónico')).toBe('');
  });
});

describe('studentNameFromFolder', () => {
  it('limpia el sufijo de Moodle', () => {
    expect(studentNameFromFolder('Juan Pérez_123456_assignsubmission_file_')).toBe(
      'Juan Pérez',
    );
  });

  it('limpia el sufijo con solo el identificador', () => {
    expect(studentNameFromFolder('Ana Gómez_987654')).toBe('Ana Gómez');
  });

  it('deja intacta una carpeta con nombre normal', () => {
    expect(studentNameFromFolder('Ana Gómez')).toBe('Ana Gómez');
  });
});

describe('tituloActividad', () => {
  it('quita el prefijo Tarea:', () => {
    expect(tituloActividad('Tarea:Actividad 1 (Real)')).toBe('Actividad 1 (Real)');
  });
});
