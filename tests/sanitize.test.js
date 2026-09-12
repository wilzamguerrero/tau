// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { sanitizarHtml } from '../src/preview/sanitize.js';

/** Pasa el HTML por el filtro y devuelve el resultado como texto. */
function limpiar(html) {
  const caja = document.createElement('div');
  caja.append(sanitizarHtml(html));
  return caja.innerHTML;
}

/** Igual que `limpiar`, pero devuelve el elemento para revisar atributos. */
function primerElemento(html) {
  const caja = document.createElement('div');
  caja.append(sanitizarHtml(html));
  return caja.firstElementChild;
}

describe('sanitizarHtml', () => {
  it('conserva el formato del documento', () => {
    const salida = limpiar(
      '<h2>Informe</h2><p>Texto con <strong>negrita</strong> y <em>cursiva</em>.</p>',
    );
    expect(salida).toBe(
      '<h2>Informe</h2><p>Texto con <strong>negrita</strong> y <em>cursiva</em>.</p>',
    );
  });

  it('conserva las tablas de una hoja de calculo', () => {
    const salida = limpiar(
      '<table><tr><td colspan="2">Total</td><td>5</td></tr></table>',
    );
    expect(salida).toContain('<td colspan="2">Total</td>');
  });

  it('descarta el script y su contenido', () => {
    // La pagina tiene las notas de todo el curso en memoria: un .docx
    // preparado a proposito no puede llegar a ejecutarse aqui.
    const salida = limpiar(
      '<p>Hola</p><script>window.robar()</script><p>Chao</p>',
    );
    expect(salida).toBe('<p>Hola</p><p>Chao</p>');
    expect(salida).not.toContain('robar');
  });

  it('descarta iframe, object, style y svg', () => {
    for (const veneno of [
      '<iframe src="https://x.co"></iframe>',
      '<object data="x.swf"></object>',
      '<style>body{display:none}</style>',
      '<svg><script>alert(1)</script></svg>',
      '<form action="https://x.co"><input name="a"></form>',
    ]) {
      expect(limpiar(`<p>ok</p>${veneno}`)).toBe('<p>ok</p>');
    }
  });

  it('quita los manejadores de eventos', () => {
    const el = primerElemento('<p onclick="robar()" onmouseover="robar()">x</p>');
    expect(el.hasAttribute('onclick')).toBe(false);
    expect(el.hasAttribute('onmouseover')).toBe(false);
  });

  it('quita los atributos no permitidos pero deja el texto', () => {
    const el = primerElemento('<p style="position:fixed" id="x" class="y">Hola</p>');
    expect(el.attributes).toHaveLength(0);
    expect(el.textContent).toBe('Hola');
  });

  it('no deja enlaces con esquemas ejecutables', () => {
    for (const href of [
      'javascript:robar()',
      'JaVaScRiPt:robar()',
      '  javascript:robar()',
      'data:text/html,<script>robar()</script>',
      'vbscript:robar',
      'file:///C:/Windows',
    ]) {
      const a = primerElemento(`<a href="${href}">enlace</a>`);
      expect(a.hasAttribute('href')).toBe(false);
      expect(a.textContent).toBe('enlace');
    }
  });

  it('deja pasar un enlace normal, pero aislado de esta pagina', () => {
    const a = primerElemento('<a href="https://moodle.edu.co/curso">curso</a>');
    expect(a.getAttribute('href')).toBe('https://moodle.edu.co/curso');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('muestra las imagenes que vienen dentro del archivo', () => {
    // Asi entrega mammoth las imagenes de un .docx.
    const src =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const img = primerElemento(`<img src="${src}" alt="grafica">`);
    expect(img.getAttribute('src')).toBe(src);
    expect(img.getAttribute('alt')).toBe('grafica');
  });

  it('no carga imagenes de internet', () => {
    // Una imagen remota le avisaria al autor de la entrega que el profesor
    // la abrio, y aqui nada debe salir del computador.
    const img = primerElemento('<img src="https://rastreo.co/pixel.png" alt="x">');
    expect(img.hasAttribute('src')).toBe(false);
  });

  it('tolera entradas vacias o rotas', () => {
    expect(limpiar('')).toBe('');
    expect(limpiar(null)).toBe('');
    expect(limpiar('<p>sin cerrar')).toBe('<p>sin cerrar</p>');
  });

  it('descarta los comentarios', () => {
    expect(limpiar('<!-- nota interna --><p>x</p>')).toBe('<p>x</p>');
  });
});
