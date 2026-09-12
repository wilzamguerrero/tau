/**
 * Iconos.
 *
 * Antes se cargaba el paquete UMD completo de Lucide desde un CDN y despues
 * de cada cambio se llamaba a `createIcons()` sobre todo el documento, con un
 * `setTimeout` para agrupar llamadas. Con cientos de tarjetas eso significaba
 * volver a recorrer el DOM entero una y otra vez, y sin internet no aparecia
 * ningun icono.
 *
 * Ahora se importan solo los iconos que la herramienta usa (el empaquetador
 * descarta el resto) y cada uno se construye como SVG en el momento. No hay
 * temporizadores, no hay recorridos globales y funciona sin conexion.
 */

import {
  Ban,
  Check,
  CircleCheck,
  CircleSlash,
  ClipboardCheck,
  Code,
  Download,
  Eye,
  FileArchive,
  FileCode,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileX,
  Film,
  Filter,
  FolderCheck,
  FolderInput,
  FolderOpen,
  FolderSearch,
  FolderX,
  Image,
  Info,
  LayoutGrid,
  ListChecks,
  Loader,
  Music,
  Paperclip,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Table2,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
  X,
  Zap,
  createElement,
} from 'lucide';

/** Nombre en kebab-case -> definicion del icono. */
const ICONOS = {
  ban: Ban,
  check: Check,
  'check-circle': CircleCheck,
  'circle-slash': CircleSlash,
  'clipboard-check': ClipboardCheck,
  code: Code,
  download: Download,
  eye: Eye,
  'file-archive': FileArchive,
  'file-code': FileCode,
  'file-down': FileDown,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  'file-x': FileX,
  film: Film,
  filter: Filter,
  'folder-check': FolderCheck,
  'folder-input': FolderInput,
  'folder-open': FolderOpen,
  'folder-search': FolderSearch,
  'folder-x': FolderX,
  image: Image,
  info: Info,
  'layout-grid': LayoutGrid,
  'list-checks': ListChecks,
  loader: Loader,
  music: Music,
  paperclip: Paperclip,
  'rotate-ccw': RotateCcw,
  save: Save,
  search: Search,
  sparkles: Sparkles,
  'table-2': Table2,
  'trash-2': Trash2,
  'alert-triangle': TriangleAlert,
  'user-plus': UserPlus,
  users: Users,
  x: X,
  zap: Zap,
};

/**
 * Crea el SVG de un icono.
 *
 * @param {keyof typeof ICONOS} nombre
 * @param {string} [extraClass] clases adicionales (por ejemplo 'spin')
 * @returns {SVGElement}
 */
export function icon(nombre, extraClass = '') {
  const def = ICONOS[nombre];
  if (!def) {
    console.warn(`Icono desconocido: ${nombre}`);
    return createElement(Paperclip, { class: `icon ${extraClass}`.trim() });
  }
  const svg = createElement(def, {
    class: `icon ${extraClass}`.trim(),
    'aria-hidden': 'true',
    focusable: 'false',
  });
  return svg;
}

/**
 * Reemplaza los marcadores `<span data-icon="nombre">` del HTML estatico por
 * sus SVG. Se llama una sola vez al arrancar.
 *
 * @param {ParentNode} [raiz]
 */
export function hydrateIcons(raiz = document) {
  for (const nodo of raiz.querySelectorAll('[data-icon]')) {
    const nombre = nodo.dataset.icon;
    if (!nombre || nodo.querySelector('svg.icon')) continue;
    nodo.append(icon(nombre));
  }
}
