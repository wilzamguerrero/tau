# Visor y Calificador de Entregas TAU

Herramienta para revisar y calificar las entregas de los estudiantes al lado de
la planilla de **TAU / Moodle**, sin salir del navegador y sin subir nada a
internet.

En vez de abrir carpeta por carpeta, buscar al estudiante en el Excel y anotar
la nota aparte, la herramienta cruza las dos cosas: muestra cada entrega con su
vista previa y un campo de nota, y al final exporta un CSV listo para importar
en TAU.

> **Ningún archivo sale del computador.** La planilla, las entregas y las notas
> se leen y se guardan localmente. No hay servidor, ni cuenta, ni analítica.

---

## Cómo se usa

**01 · Cargar la planilla TAU**
El `.xlsx` o `.csv` que descarga TAU con los estudiantes y las columnas de
actividades. De ahí salen los nombres, los correos y qué actividades existen.

**02 · Cargar las carpetas de las actividades**
La carpeta que descarga Moodle con las entregas. La herramienta la recorre
completa y clasifica cada caso:

| Estado | Qué significa |
| --- | --- |
| Entregó | Hay archivos; se muestran con vista previa |
| Carpeta vacía | Subió la carpeta pero sin archivos |
| No entregó | Está en la planilla y no tiene carpeta |
| Revisar | El nombre de la carpeta no coincide exactamente con la planilla |

Los tres primeros se distinguen a propósito: "carpeta vacía" y "no entregó" no
son lo mismo a la hora de reclamar.

**03 · Consolidado y exportación**
Tabla de notas por actividad con el promedio, y el botón que genera
`Notas_Importar_TAU_<fecha>.csv` para subir de vuelta a TAU.

### Vistas previas

Se abren dentro de la misma página, sin programas externos:

- **PDF, imágenes, audio y video** — visor del navegador
- **`.docx`** — se convierte a HTML con [mammoth](https://github.com/mwilliamson/mammoth.js)
- **`.xlsx` / `.csv`** — se muestra como tabla con [SheetJS](https://sheetjs.com)
- **`.zip`** — lista el contenido sin descomprimir en disco
- **Texto y código** — con límite de tamaño para no congelar la pestaña

El HTML que sale de un `.docx` o de una hoja de cálculo **lo genera el archivo
del estudiante**, así que pasa por un filtro de etiquetas
([`src/preview/sanitize.js`](src/preview/sanitize.js)) antes de entrar a la
página: se descartan `script`, `style`, `iframe`, los manejadores de eventos y
cualquier `href` que no sea `http(s)` o un ancla interna. Las imágenes solo se
muestran si vienen dentro del propio archivo, para que una entrega no pueda
avisarle a nadie de afuera que fue abierta.

---

## Lo que cuida la herramienta

Estas decisiones están para que no se pierdan ni se dañen notas:

- **Nunca se pisa una nota ya subida.** Al cargar la planilla se adopta la nota
  de TAU solo si localmente no hay ninguna.
- **Una celda vacía no es un cero.** Se distinguen "sin calificar" y "0,0" en
  todo el recorrido, incluida la exportación.
- **Si TAU renombra una columna**, la nota se migra a la columna nueva
  (`Tarea:ACTIVIDAD 1` → `Tarea:Actividad 1 (Real)`). Si hay ambigüedad, no se
  mueve: mejor una columna de más que una nota en la actividad equivocada.
- **Los nombres se emparejan sin depender del orden ni de las tildes**, porque
  Moodle nombra las carpetas "Nombres Apellidos" y TAU lista "Apellidos
  Nombres". Lo dudoso se marca como *revisar* en vez de asignarse a ciegas.
- **Las notas fuera de escala se recortan** a 0,0–5,0 y se marcan en pantalla
  (teclear `45` queriendo `4.5` es el error típico).
- **Guardado automático** en el navegador tras cada edición, más un archivo
  `.json` de avance que se puede archivar y restaurar en otro computador.

La escala de calificación, las palabras que identifican una actividad y demás
parámetros están en un solo archivo: [`src/config.js`](src/config.js).

---

## Desarrollo

Requiere Node 20 o superior.

```bash
npm install
npm run dev       # servidor local con recarga
npm test          # pruebas del núcleo
npm run build     # sitio en dist/
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm test` | Corre las pruebas una vez |
| `npm run test:watch` | Pruebas en modo continuo |
| `npm run build` | Compila el sitio a `dist/` |
| `npm run build:offline` | Compila **un solo archivo HTML** a `dist-offline/` |
| `npm run preview` | Sirve `dist/` para revisarlo antes de desplegar |

### Estructura

```
index.html            Marcado de la página (sin lógica ni estilos dentro)
src/
  config.js           Parámetros ajustables
  main.js             Arranque y conexión de todo
  core/               Lógica pura, sin DOM: notas, nombres, planilla, estado
  features/           Cada paso de la herramienta, uno por archivo
  preview/            Vistas previas por tipo de archivo + filtro de HTML
  ui/                 Ayudantes de DOM, iconos y avisos
  styles/             CSS por capas (tokens, base, componentes)
  vendor/             Carga diferida de las librerías pesadas
tests/                Pruebas del núcleo (Vitest)
```

`core/` no importa nada de `features/` ni toca el DOM: es la parte que decide
las notas y la que está cubierta por las pruebas.

Las librerías pesadas (`xlsx`, `mammoth`, `jszip`) se cargan con `import()`
dinámico solo cuando se abre un archivo de ese tipo, así que la carga inicial
es de unos 48 kB de JavaScript.

### Pruebas

```bash
npm test
```

Cubren lo que puede dañar una nota: interpretación de las notas de la planilla
(coma decimal, celda vacía, recorte de escala), emparejamiento de carpetas con
estudiantes, lectura de encabezados de TAU, agrupación de entregas, persistencia
y el filtro de HTML de las vistas previas.

---

## Despliegue

El mismo código sirve para los tres destinos. Solo cambia la ruta base.

### Vercel

Importar el repositorio; [`vercel.json`](vercel.json) ya trae el comando de
compilación, el directorio de salida y las cabeceras de seguridad. Sin
configuración adicional.

### Cloudflare Pages

- Comando de compilación: `npm run build`
- Directorio de salida: `dist`

Las cabeceras salen de [`public/_headers`](public/_headers).

### GitHub Pages

El workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) publica en
cada push a `main`. Hay que activar Pages en *Settings → Pages → Source: GitHub
Actions*.

Como Pages sirve el sitio en `https://USUARIO.github.io/tau/` y no en la raíz
del dominio, el workflow compila con `BASE_PATH=/tau/`. **Si el repositorio se
renombra, hay que cambiar ese valor en el workflow.**

### Sin internet

```bash
npm run build:offline
```

Genera `dist-offline/index.html`: un único archivo con todo adentro, que
funciona con doble clic desde una memoria USB. El sitio desplegado también
funciona sin conexión después de la primera visita, porque se instala como PWA.

---

## Privacidad

Todo ocurre en el navegador: la planilla y las entregas se leen con las APIs de
archivos locales y nunca se envían a ninguna parte. Las notas viven en el
`localStorage` del navegador y en el `.json` de avance que se guarde a mano. La
política de seguridad de contenido del sitio desplegado bloquea cualquier
conexión saliente.

Por eso [`.gitignore`](.gitignore) excluye `*.xlsx`, `*.xls`, el `.json` de
avance, los CSV de notas y las carpetas `entregas/` y `planillas/`: **los datos
reales de los estudiantes no deben terminar en el repositorio.**

---

## Compatibilidad

Chrome, Edge u Opera recientes aprovechan la File System Access API: se escoge
la carpeta con el selector del sistema y el archivo de avance se sobrescribe en
su sitio. En Firefox y Safari funciona igual, con el selector de carpetas
clásico y descargando el avance.

## Licencia

MIT. Ver [LICENSE](LICENSE).
