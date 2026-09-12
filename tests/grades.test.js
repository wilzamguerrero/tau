import { describe, expect, it } from 'vitest';

import { ESCALA } from '../src/config.js';
import {
  clampNota,
  esNotaValida,
  formatNota,
  formatNotaCSV,
  parseNota,
  promedio,
} from '../src/core/grades.js';

describe('parseNota', () => {
  it('acepta la coma decimal que usa TAU', () => {
    expect(parseNota('4,5')).toBe(4.5);
  });

  it('acepta el punto decimal', () => {
    expect(parseNota('4.5')).toBe(4.5);
    expect(parseNota(3)).toBe(3);
  });

  it('trata como "sin nota" lo que no es una nota', () => {
    // Importa: una celda vacia NO es un cero. Si se confundieran, exportar
    // pondria 0,0 en TAU sobre notas que ya estaban subidas.
    for (const vacio of ['', '   ', '-', 'Ausente', undefined, null]) {
      expect(parseNota(vacio)).toBeNull();
    }
  });
});

describe('clampNota', () => {
  it('recorta por encima del maximo y avisa', () => {
    // Teclear "45" queriendo "4.5" es el error tipico.
    expect(clampNota(45)).toEqual({ valor: ESCALA.max, recortada: true });
  });

  it('recorta por debajo del minimo y avisa', () => {
    expect(clampNota(-2)).toEqual({ valor: ESCALA.min, recortada: true });
  });

  it('deja intacta una nota dentro de la escala', () => {
    expect(clampNota(3.7)).toEqual({ valor: 3.7, recortada: false });
  });

  it('acepta los extremos exactos sin marcarlos', () => {
    expect(clampNota(ESCALA.min).recortada).toBe(false);
    expect(clampNota(ESCALA.max).recortada).toBe(false);
  });
});

describe('esNotaValida', () => {
  it('distingue el cero de la ausencia de nota', () => {
    expect(esNotaValida(0)).toBe(true);
    expect(esNotaValida('')).toBe(false);
    expect(esNotaValida(undefined)).toBe(false);
    expect(esNotaValida(null)).toBe(false);
  });
});

describe('formato', () => {
  it('muestra con punto y exporta con coma', () => {
    expect(formatNota(4.5)).toBe('4.5');
    expect(formatNotaCSV(4.5)).toBe('4,5');
  });

  it('completa el decimal', () => {
    expect(formatNota(4)).toBe('4.0');
    expect(formatNotaCSV(0)).toBe('0,0');
  });
});

describe('promedio', () => {
  const actividades = ['Tarea:Actividad 1', 'Tarea:Actividad 2'];

  it('cuenta como 0 la actividad sin nota', () => {
    // Es la regla del curso y coincide con lo que se exporta a TAU.
    const est = { 'Tarea:Actividad 1': 5 };
    expect(promedio(est, actividades)).toBe(2.5);
  });

  it('promedia las notas presentes', () => {
    const est = { 'Tarea:Actividad 1': 4, 'Tarea:Actividad 2': 3 };
    expect(promedio(est, actividades)).toBe(3.5);
  });

  it('no divide por cero cuando no hay actividades', () => {
    expect(promedio({}, [])).toBe(0);
  });
});
