/**
 * Limpieza del HTML generado a partir de archivos de estudiantes.
 *
 * Las entregas son contenido que no controlamos. Al convertir un .docx con
 * mammoth o una hoja de calculo con SheetJS se obtiene HTML que despues se
 * inserta en la pagina, y la pagina tiene acceso a las notas de todo el
 * curso: un archivo preparado a proposito podria aprovecharlo.
 *
 * Aqui se reconstruye ese HTML dejando solo etiquetas y atributos de formato.
 * Se parsea en un documento aparte (`DOMParser`), donde nada se ejecuta ni se
 * descarga, y se copia nodo por nodo lo que esta permitido.
 */

const ETIQUETAS_PERMITIDAS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'dd',
  'del', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li', 'ol', 'p', 'pre', 's',
  'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'tr', 'u', 'ul',
]);

/** Atributos aceptados, por etiqueta. '*' aplica a todas. */
const ATRIBUTOS_PERMITIDOS = {
  '*': ['title'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  col: ['span'],
  colgroup: ['span'],
  ol: ['start', 'type'],
};

/**
 * Destino de un enlace. Se acepta solo lo que el profesor podria querer
 * abrir a mano: un ancla dentro del documento o una direccion web normal.
 * Nada de javascript:, vbscript: ni data: (un data:text/html es una pagina
 * completa con permisos de este sitio).
 */
function enlaceSeguro(valor) {
  const v = (valor || '').trim();
  if (!v) return false;
  if (v.startsWith('#')) return true;
  return /^https?:\/\//i.test(v);
}

/**
 * Origen de una imagen. Solo datos que ya estan en el computador: asi una
 * entrega no puede avisarle a nadie de afuera que fue abierta, que es la
 * promesa de la herramienta (nada sale del computador). Mammoth entrega
 * las imagenes de un .docx justamente como data: en base64.
 */
function imagenSegura(valor) {
  const v = (valor || '').trim();
  if (!v) return false;
  if (/^blob:/i.test(v)) return true;
  return /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,/i.test(v);
}

function limpiarAtributos(origen, destino) {
  const tag = destino.tagName.toLowerCase();
  const permitidos = [
    ...(ATRIBUTOS_PERMITIDOS['*'] ?? []),
    ...(ATRIBUTOS_PERMITIDOS[tag] ?? []),
  ];

  for (const attr of [...origen.attributes]) {
    const nombre = attr.name.toLowerCase();
    if (!permitidos.includes(nombre)) continue;

    // href y src solo con esquemas seguros. Las imagenes del .docx llegan
    // como data: en base64, asi que ahi si se aceptan.
    if (nombre === 'href' && !enlaceSeguro(attr.value)) continue;
    if (nombre === 'src' && !imagenSegura(attr.value)) continue;

    destino.setAttribute(nombre, attr.value);
  }

  // Todo enlace se abre aparte y sin dar acceso a esta pagina.
  if (tag === 'a' && destino.hasAttribute('href')) {
    destino.setAttribute('target', '_blank');
    destino.setAttribute('rel', 'noopener noreferrer nofollow');
  }
}

function copiarHijos(origen, destino, doc) {
  for (const nodo of origen.childNodes) {
    if (nodo.nodeType === Node.TEXT_NODE) {
      destino.append(doc.createTextNode(nodo.nodeValue));
      continue;
    }
    if (nodo.nodeType !== Node.ELEMENT_NODE) continue; // comentarios fuera

    const tag = nodo.tagName.toLowerCase();
    if (!ETIQUETAS_PERMITIDAS.has(tag)) {
      // <script>, <style>, <iframe>, <object>... se descartan por completo,
      // igual que su contenido: no es texto que el profesor deba leer.
      continue;
    }

    const limpio = doc.createElement(tag);
    limpiarAtributos(nodo, limpio);
    copiarHijos(nodo, limpio, doc);
    destino.append(limpio);
  }
}

/**
 * Devuelve un fragmento seguro con el contenido de formato del HTML dado.
 *
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function sanitizarHtml(html) {
  const fragmento = document.createDocumentFragment();
  if (!html) return fragmento;

  const sucio = new DOMParser().parseFromString(String(html), 'text/html');
  copiarHijos(sucio.body, fragmento, document);
  return fragmento;
}
