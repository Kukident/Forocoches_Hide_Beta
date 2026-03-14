# Changelog

## [2.0.0] — 2026-03-14

Reescritura completa de la extensión.

### Cambios principales
- Migración a **WXT** (build framework), **Vue 3**, **TypeScript** y **Tailwind CSS**
- Compatible con **Manifest V3** (Chrome) y **Manifest V3** (Firefox)
- Eliminada dependencia de jQuery — todo vanilla JS y Vue
- Nuevo esquema de almacenamiento **v1** con claves O(1) por foro/grupo
- Sincronización entre dispositivos comprimida con lz-string
- Nuevo sistema de **grupos de filtros rápidos** con duración temporal y por sesión
- **Resaltado de hilos** por palabras y usuarios con colores personalizables
- **Usuarios VIP** unificados: resaltado de hilos, resaltado de posts, notas, colores individuales
- **Protección VIP**: los hilos de usuarios VIP nunca se ocultan por filtros
- **Indicador de filtro** para ocultar y resaltar
- **Ignorar usuarios en posts** con modo spoiler u ocultar
- **Resaltado de OP** y **poles** (hilos con 0 respuestas)
- **Notas de usuario** visibles en lista de hilos y en posts
- **Embed de vídeos** WebM, MP4 y OGG inline en posts
- Página de opciones rediseñada con navegación lateral
- Popup rediseñado con acciones rápidas sobre el OP del hilo
- Soporte para tema viejo y nuevo de Forocoches

### Mejoras técnicas
- Suite de tests con Vitest (192 tests)
- Validación estricta de datos con `validateFcData()`
- Migraciones automáticas desde versiones anteriores
- Build reproducible para Chrome y Firefox

## [1.1.3]

- Subida de fotos a Imgur al crear post (drag & drop)
- Contador de palabras/usuarios en ajustes
- Arreglado fallo al reproducir algunos WebMs

## [1.1.0]

- Arreglado problema al guardar demasiada información (sincronización Chrome)
- Limpieza y comentado de código

## [1.0.0]

- Lanzamiento inicial: ocultar hilos por palabras y usuarios
- Reproducción inline de WebMs
- Popup para añadir filtros rápidamente
