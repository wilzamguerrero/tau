import { describe, expect, it } from 'vitest';

import {
  findKey,
  getEmail,
  getNombreCompleto,
  isActivityColumn,
  tieneApellido,
} from '../src/core/spreadsheet.js';

/** Una fila como las que descarga TAU, con los encabezados reales. */
const FILA = {
  'Nombre': 'Ana María',
  'Apellido(s)': 'Gómez Ruiz',
  'Nombre de usuario': 'agomez',
  'Dirección de correo': 'Ana.Gomez@Universidad.Edu.CO',
  'Tarea:ACTIVIDAD 1 (Real)': '4,5',
  'Total del curso (Real)': '4,5',
  'Última descarga de este curso': '2026-09-01',
};

describe('findKey', () => {
  it('prefiere la coincidencia exacta a la parcial', () => {
    // Sin esto, "Nombre" caia en "Nombre de usuario" segun el orden de las
    // columnas, y el listado mostraba el login en vez de la persona.
    expect(findKey(FILA, ['nombre'])).toBe('Nombre');
  });

  it('respeta el orden de prioridad de los patrones', () => {
    expect(findKey(FILA, ['apellidos', 'apellido(s)'])).toBe('Apellido(s)');
  });

  it('aplica las exclusiones', () => {
    expect(findKey(FILA, ['usuario'], ['nombre de usuario'])).toBeNull();
  });

  it('devuelve null cuando no hay nada parecido', () => {
    expect(findKey(FILA, ['telefono'])).toBeNull();
  });

  it('tolera una fila vacia', () => {
    expect(findKey(null, ['nombre'])).toBeNull();
  });
});

describe('getEmail', () => {
  it('normaliza a minusculas y sin espacios', () => {
    // El correo es la llave con la que se guardan las notas: si no se
    // normaliza, el mismo estudiante acaba con dos registros.
    expect(getEmail(FILA)).toBe('ana.gomez@universidad.edu.co');
  });

  it('devuelve vacio si la fila no trae correo', () => {
    expect(getEmail({ Nombre: 'Ana' })).toBe('');
  });

  it('reconoce el encabezado en ingles', () => {
    expect(getEmail({ Email: 'a@b.co' })).toBe('a@b.co');
  });
});

describe('getNombreCompleto', () => {
  it('devuelve "Apellidos Nombres", el orden de una lista de clase', () => {
    expect(getNombreCompleto(FILA)).toBe('Gómez Ruiz Ana María');
  });

  it('no usa el login de Moodle como nombre', () => {
    expect(getNombreCompleto(FILA)).not.toContain('agomez');
  });

  it('funciona con solo una de las dos columnas', () => {
    expect(getNombreCompleto({ Nombre: 'Ana' })).toBe('Ana');
    expect(getNombreCompleto({ 'Apellido(s)': 'Gómez' })).toBe('Gómez');
  });
});

describe('tieneApellido', () => {
  it('detecta la columna de apellidos', () => {
    expect(tieneApellido(FILA)).toBe(true);
    expect(tieneApellido({ Nombre: 'Ana' })).toBe(false);
  });
});

describe('isActivityColumn', () => {
  it('acepta las columnas de actividad', () => {
    expect(isActivityColumn('Tarea:ACTIVIDAD 1 (Real)')).toBe(true);
    expect(isActivityColumn('Taller de laboratorio')).toBe(true);
    expect(isActivityColumn('Quiz 2')).toBe(true);
  });

  it('rechaza el total del curso', () => {
    // Exportarlo como actividad reescribiria la nota final en TAU.
    expect(isActivityColumn('Total del curso (Real)')).toBe(false);
  });

  it('rechaza las columnas administrativas', () => {
    expect(isActivityColumn('Dirección de correo')).toBe(false);
    expect(isActivityColumn('Nombre de usuario')).toBe(false);
    expect(isActivityColumn('')).toBe(false);
  });

  it('detecta las columnas de la fila de ejemplo tal como llegan', () => {
    const actividades = Object.keys(FILA).filter(isActivityColumn);
    expect(actividades).toEqual(['Tarea:ACTIVIDAD 1 (Real)']);
  });
});
