# Forocoches+

> Extensión de navegador para filtrar hilos en [Forocoches](https://forocoches.com) por palabras clave o usuarios, con personalización por subforo y modos rápidos globales.

![Versión](https://img.shields.io/badge/versión-1.1.3-blue)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-green)
![Firefox MV2](https://img.shields.io/badge/Firefox-MV2-orange)
![WXT](https://img.shields.io/badge/WXT-framework-purple)

---

## Capturas de pantalla

<!-- PLACEHOLDER: imagen del popup sobre un subforo de Forocoches -->
> _[Captura del popup mostrando filtros del subforo actual]_

<!-- PLACEHOLDER: imagen de la página de opciones con la lista de palabras filtradas -->
> _[Captura de la página de opciones — gestión de filtros por subforo]_

<!-- PLACEHOLDER: imagen de los modos rápidos en el popup -->
> _[Captura de los modos rápidos activados desde el popup]_

---

## Funcionalidades

### Filtrado de hilos

- **Filtrar por palabras clave** — Cualquier hilo cuyo título contenga una palabra configurada desaparece automáticamente.
- **Filtrar por usuario** — Oculta todos los hilos creados por un usuario concreto.
- **Configuración por subforo** — Cada subforo tiene su propia lista de palabras y usuarios. Lo que filtras en Motor no afecta a Deportes.
- **Indicador de causa** — Muestra junto al hilo oculto/resaltado qué palabra o usuario activó el filtro.
- **Compatible con ambos temas** — Funciona con el tema clásico y con el nuevo diseño de Forocoches.

### Resaltar hilos

- **Resaltar por palabras/usuarios** — En lugar de ocultar, colorea el fondo de los hilos que contengan ciertas palabras o sean de ciertos usuarios. Configura listas independientes de las de ocultado.
- **Identificar poles** — Resalta con un color diferente los hilos sin respuestas (0 replies).
- **Resaltar usuarios VIP** — Destaca los hilos de usuarios VIP con un color configurable en la lista de hilos.
- **Color personalizable** — Elige entre presets o usa el color picker para cada tipo de resaltado.

### Funcionalidades en hilos (showthread)

- **Ignorar usuarios en posts** — Colapsa en spoiler los mensajes de usuarios de tu lista de ignorados dentro de los hilos. Haz clic en la barra para expandir/ocultar.
- **Resaltar mensajes del OP** — Colorea el fondo de los mensajes del creador del hilo para identificarlos de un vistazo.
- **Resaltar mensajes de usuarios VIP** — Destaca los mensajes de tus usuarios VIP con un color configurable.
- **Notas en usuarios** — Asocia notas personales a usuarios que aparecen junto a su nombre tanto en la lista de hilos como dentro de los hilos.

### Popup rápido

Abre el popup desde la barra del navegador estando en cualquier subforo para:

- Añadir palabras o usuarios al vuelo sin salir del foro.
- Activar/desactivar la extensión globalmente con un toggle.
- Gestionar tus **modos rápidos** con un solo clic.

### Modos rápidos (Quick Groups)

Agrupa conjuntos de filtros bajo un nombre (ej: _Fútbol_, _Política_, _F1_) y actívalos o desactívalos desde el popup sin tocar la configuración por subforo. Los grupos son **aditivos**: se suman a los filtros del subforo actual.

- Crea, edita y elimina grupos desde la página de opciones.
- Activa/desactiva cada grupo con un toggle desde el popup.
- **Duración configurable** — manual, por sesión, o por horas (se desactivan automáticamente).
- Los cambios se aplican en tiempo real sin recargar la página.

### Página de opciones avanzadas

Accede a la configuración completa desde _Ajustes avanzados_ en el popup:

| Sección | Descripción |
|---|---|
| Foro | Toggle global, resaltado de hilos/poles/VIP, indicador de causa, listas de palabras y usuarios a resaltar |
| Hilos | Ignorar usuarios en posts, resaltar OP, notas en usuarios |
| Modos rápidos | Crea y administra grupos de filtros globales con duración |
| Ajustes | Exportar/importar configuración y resetear datos |

### Copia de seguridad y restauración

Exporta toda tu configuración a un archivo JSON y restáurala en cualquier momento o navegador desde la sección **Ajustes**.

### Sincronización entre dispositivos

Los filtros se sincronizan automáticamente entre tus dispositivos usando `storage.sync` del navegador. La extensión usa compresión LZ para maximizar los datos que caben en el límite de almacenamiento. Los cambios hechos en un dispositivo llegan al resto en segundos.

### Extras en el foro

- **Reproducción de vídeos WebM** — Los enlaces a `.webm` dentro de los hilos se convierten en reproductores de vídeo embebidos.

---

## Instalación

### Desde las tiendas oficiales

> _[Próximamente en Chrome Web Store y Firefox Add-ons]_

### Desde el código fuente

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/forocoches-hide.git
cd forocoches-hide

# Instalar dependencias
npm install

# Build para Chrome (MV3)
npm run build

# Build para Firefox (MV2)
npm run build:firefox
```

Luego carga la carpeta `.output/chrome-mv3/` (o `.output/firefox-mv3/`) como extensión descomprimida en tu navegador.

---

## Desarrollo

```bash
npm run dev            # Chrome con hot-reload
npm run dev:firefox    # Firefox con hot-reload

npm run zip            # Empaqueta para Chrome Web Store
npm run zip:firefox    # Empaqueta para Firefox Add-ons
```

### Stack tecnológico

| Herramienta | Uso |
|---|---|
| [WXT](https://wxt.dev) | Framework para extensiones de navegador |
| [Vue 3](https://vuejs.org) + TypeScript | UI del popup y página de opciones |
| [Tailwind CSS](https://tailwindcss.com) + [Flowbite](https://flowbite.com) | Estilos y componentes UI |
| [lz-string](https://github.com/pieroxy/lz-string) | Compresión del snapshot de sincronización |
| Vanilla JS | Content scripts (sin dependencias) |

---

## Cómo funciona

1. Al entrar en un subforo, el content script analiza el listado de hilos.
2. Carga los filtros del subforo actual más los grupos rápidos activos.
3. Oculta los hilos que coinciden y muestra un contador con los hilos ocultados.
4. Puedes expandir los hilos ocultos con el botón _"X hilos ocultos"_.
5. Cualquier cambio en los filtros se aplica en tiempo real via mensaje interno (`RERUN_FILTERS`).

---

## Privacidad

Forocoches+ **no recopila ningún dato**. Todo se almacena localmente en tu navegador. La sincronización entre dispositivos usa únicamente el almacenamiento cifrado del propio navegador (`storage.sync`).

---

## Aviso legal

Forocoches+ es un proyecto independiente de código abierto. No está afiliado,
asociado ni respaldado por forocoches.com ni por sus propietarios. "Forocoches"
es una marca registrada propiedad de su legítimo titular. El uso del nombre es
puramente referencial para indicar compatibilidad.

---

## Licencia

MIT
