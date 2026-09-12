/**
 * Ayudas minimas para construir DOM.
 *
 * El prototipo creaba los nodos a mano (createElement + appendChild + una
 * linea por atributo), lo que hacia dificil leer la forma de una tarjeta.
 * `el()` deja ver la estructura de un golpe y sigue siendo DOM puro: nada
 * de innerHTML con datos de estudiantes.
 */

/**
 * Crea un elemento.
 *
 * @param {string} tag
 * @param {object} [props]  clases, atributos y propiedades
 *   - `class`    string
 *   - `text`     textContent (seguro: no interpreta HTML)
 *   - `html`     innerHTML (solo para textos fijos de la interfaz)
 *   - `dataset`  objeto de data-atributos
 *   - `attrs`    objeto de atributos literales
 *   - `on`       objeto de manejadores { click: fn }
 *   - resto      se asignan como propiedades (type, value, disabled...)
 * @param {(Node|string|null|undefined|false)[]} [hijos]
 */
export function el(tag, props = {}, hijos = []) {
  const node = document.createElement(tag);
  const { class: cls, text, html, dataset, attrs, on, ...resto } = props;

  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  if (html !== undefined) node.innerHTML = html;
  if (dataset) Object.assign(node.dataset, dataset);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (on) for (const [ev, fn] of Object.entries(on)) node.addEventListener(ev, fn);
  Object.assign(node, resto);

  agregar(node, hijos);
  return node;
}

/** Agrega hijos, ignorando null/false/undefined para permitir condicionales. */
export function agregar(padre, hijos) {
  for (const hijo of [].concat(hijos)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    padre.append(hijo);
  }
  return padre;
}

/** Vacia un contenedor. */
export function vaciar(node) {
  node.replaceChildren();
  return node;
}

/** Muestra u oculta con la clase utilitaria, sin tocar estilos en linea. */
export function mostrar(node, visible) {
  node.classList.toggle('is-visible', Boolean(visible));
  return node;
}

/** Tamano de archivo legible: 1536 -> "1.5 KB". */
export function humanSize(bytes) {
  if (bytes === undefined || bytes === null) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/**
 * Dispara una descarga en el navegador.
 *
 * La URL del blob se libera con un retardo: revocarla en la misma vuelta
 * del event loop cancela la descarga en Firefox y Safari.
 */
export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
