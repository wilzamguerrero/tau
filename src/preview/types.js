/**
 * Tipos de archivo reconocidos en las entregas.
 *
 * La clasificacion se hace por extension: es lo unico confiable, porque
 * `File.type` viene vacio para muchos formatos y depende del sistema
 * operativo del estudiante.
 */

const EXT = {
  img: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif', '.ico', '.jfif'],
  pdf: ['.pdf'],
  video: ['.mp4', '.webm', '.ogv', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.mpg', '.mpeg', '.wmv', '.flv'],
  audio: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.oga', '.opus', '.ogg', '.wma'],
  html: ['.html', '.htm'],
  text: [
    '.txt', '.md', '.csv', '.tsv', '.json', '.xml', '.log',
    '.js', '.ts', '.jsx', '.tsx', '.css', '.py', '.java', '.c', '.h', '.cpp',
    '.cs', '.php', '.sql', '.rb', '.go', '.rs', '.sh', '.bat', '.ps1',
    '.ini', '.cfg', '.conf', '.yml', '.yaml', '.srt', '.vtt',
    '.r', '.m', '.pas', '.asm', '.env',
  ],
  zip: ['.zip'],
  docx: ['.docx'],
  sheet: ['.xlsx', '.xls'],
};

/**
 * Orden de comprobacion. Importa: .svg y .csv aparecen en dos listas
 * (imagen/texto), y gana la primera que coincida.
 */
const ORDEN = ['img', 'pdf', 'video', 'audio', 'html', 'text', 'zip', 'docx', 'sheet'];

/** @typedef {'img'|'pdf'|'video'|'audio'|'html'|'text'|'zip'|'docx'|'sheet'|'other'} TipoArchivo */

/** ¿El nombre termina en alguna de las extensiones dadas? */
export function hasExt(nombre, lista) {
  const n = (nombre || '').toLowerCase();
  return lista.some((x) => n.endsWith(x));
}

/** @returns {TipoArchivo} */
export function kindOf(nombre) {
  for (const tipo of ORDEN) {
    if (hasExt(nombre, EXT[tipo])) return tipo;
  }
  return 'other';
}

const ICONO_POR_TIPO = {
  img: 'image',
  pdf: 'file-text',
  video: 'film',
  audio: 'music',
  html: 'code',
  text: 'file-code',
  zip: 'file-archive',
  docx: 'file-text',
  sheet: 'file-spreadsheet',
  other: 'paperclip',
};

/** Icono que representa el tipo de archivo. */
export function iconFor(tipo) {
  return ICONO_POR_TIPO[tipo] ?? 'paperclip';
}

/** Icono a partir del nombre del archivo. */
export function iconForName(nombre) {
  return iconFor(kindOf(nombre));
}
