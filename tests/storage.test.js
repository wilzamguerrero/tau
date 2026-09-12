// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY, STORAGE_VERSION } from '../src/config.js';
import {
  clearLocalState,
  loadLocalState,
  onStorageError,
  saveLocalStateNow,
} from '../src/core/storage.js';
import { resetState, state } from '../src/core/state.js';

/** Una fila de planilla con lo minimo que se necesita para re-enlazar. */
const FILA = {
  'Nombre': 'Ana María',
  'Apellido(s)': 'Gómez Ruiz',
  'Dirección de correo': 'ana@u.co',
  'Tarea:Actividad 1 (Real)': '',
};

beforeEach(() => {
  localStorage.clear();
  resetState();
  onStorageError(null);
});

describe('guardar y restaurar', () => {
  it('recupera las notas despues de cerrar la pestana', () => {
    state.tauData = [FILA];
    state.tauColumns = Object.keys(FILA);
    state.actividadesDetectadas = ['Tarea:Actividad 1 (Real)'];
    state.notasGlobales['ana@u.co'] = {
      nombre: 'Gómez Ruiz Ana María',
      email: 'ana@u.co',
      info: FILA,
      'Tarea:Actividad 1 (Real)': 4.5,
    };

    expect(saveLocalStateNow()).toBe(true);
    resetState();
    expect(loadLocalState()).toBe(true);

    expect(state.notasGlobales['ana@u.co']['Tarea:Actividad 1 (Real)']).toBe(4.5);
    expect(state.actividadesDetectadas).toEqual(['Tarea:Actividad 1 (Real)']);
  });

  it('no duplica la fila cruda en el navegador', () => {
    // Guardar `info` por estudiante era lo que reventaba la cuota de 5 MB en
    // cursos grandes; la fila ya viaja una sola vez en tauData.
    state.tauData = [FILA];
    state.notasGlobales['ana@u.co'] = { nombre: 'Ana', email: 'ana@u.co', info: FILA };
    saveLocalStateNow();

    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(guardado.notasGlobales['ana@u.co'].info).toBeUndefined();
    expect(guardado.version).toBe(STORAGE_VERSION);
  });

  it('vuelve a enlazar la fila de la planilla al cargar', () => {
    state.tauData = [FILA];
    state.notasGlobales['ana@u.co'] = { nombre: 'Ana', email: 'ana@u.co', info: FILA };
    saveLocalStateNow();
    resetState();
    loadLocalState();

    expect(state.notasGlobales['ana@u.co'].info).toEqual(FILA);
  });

  it('deja sin fila a quien ya no esta en la planilla, sin perder su nota', () => {
    state.tauData = [];
    state.notasGlobales['viejo@u.co'] = {
      nombre: 'Estudiante Retirado',
      email: 'viejo@u.co',
      'Tarea:Actividad 1': 3,
    };
    saveLocalStateNow();
    resetState();
    loadLocalState();

    expect(state.notasGlobales['viejo@u.co'].info).toBeUndefined();
    expect(state.notasGlobales['viejo@u.co']['Tarea:Actividad 1']).toBe(3);
  });

  it('reconstruye el indice de nombres al restaurar', () => {
    // Sin esto la cuadricula no emparejaria ninguna carpeta tras recargar.
    state.notasGlobales['ana@u.co'] = { nombre: 'Gómez Ruiz Ana María', email: 'ana@u.co' };
    saveLocalStateNow();
    resetState();
    loadLocalState();

    expect(Object.keys(state.nameIndex).length).toBe(1);
  });
});

describe('cuando el navegador no deja guardar', () => {
  it('avisa en vez de fallar en silencio', () => {
    // Modo privado o cuota llena: el profesor tiene que enterarse para poder
    // guardar el .json de avance a mano.
    const avisos = [];
    onStorageError((m) => avisos.push(m));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('lleno', 'QuotaExceededError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(saveLocalStateNow()).toBe(false);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('SIN RESPALDO AUTOMATICO');
  });
});

describe('loadLocalState', () => {
  it('devuelve false cuando no hay nada guardado', () => {
    expect(loadLocalState()).toBe(false);
  });

  it('no se rompe con un respaldo corrupto', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{esto no es json');
    expect(loadLocalState()).toBe(false);
  });
});

describe('clearLocalState', () => {
  it('borra la copia del navegador', () => {
    state.notasGlobales['ana@u.co'] = { nombre: 'Ana', email: 'ana@u.co' };
    saveLocalStateNow();
    clearLocalState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
