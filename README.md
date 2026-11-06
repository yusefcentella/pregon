# Pregón

Publica y sabe qué publicación te trae las ventas por WhatsApp. Versión para pymes mexicanas (MXN con IVA incluido, fechas DD/MM/AAAA, zona America/Mexico_City).

## Estructura (la lógica está separada del acceso a datos)

| Archivo | Qué contiene | ¿Depende de la plataforma? |
|---|---|---|
| `src/logic.js` | Validadores (RFC, CLABE, teléfono, CP), generador de textos, CSV, exportaciones, autoverificación. Funciones puras. | No |
| `src/seed.js` | Datos del espacio demo (ficticios, semilla fija) | No |
| `src/store.js` | **Único** archivo que toca `localStorage` y las capacidades de Claude (`db`, `user`, `sample`, `downloads`) | **Sí** |
| `src/ui.js` | Páginas, gráficas, eventos | No (solo usa `Store`) |
| `src/styles.css` | Sistema de diseño | No |
| `build.cjs` | Junta todo en `dist/index.html` (`node build.cjs`) | No |
| `test.cjs` | Autoverificación en Node (`node test.cjs`) | No |

## Qué depende de Claude (artefactos) y cómo reemplazarlo

| Hoy en Claude | Al migrar |
|---|---|
| `claude.use('db')`: colecciones `metricas`, `espacios/<token>`, doc `config/app` | Una base propia (Postgres/SQLite) con una API; reimplementa `Store.track`, `leerMetricas`, `guardarEspacio`, `traerEspacioRemoto`, `cargarConfig`, `guardarConfig`. |
| `claude.use('user').isOwner()` protege `/metricas` | Sustituir por la variable de entorno `ADMIN_KEY` (encabezado o parámetro) en el servidor. |
| Constante `CONFIG.FOUNDER_PAYMENT_URL` y campo en `/metricas` | Variable de entorno `FOUNDER_PAYMENT_URL`. Lo mismo con `FOUNDER_SOLD`. |
| `claude.use('downloads')` | Ya hay respaldo con `<a download>` fuera de la plataforma. |
| `claude.use('sample')` (botón “Reescribir con IA”) | Llamada a tu proveedor de IA desde el servidor. Si no existe, el botón se oculta. |
| Imágenes | Las miniaturas son SVG dentro del código (`THUMBS` en `ui.js`), no dependen de nada externo. |

Fuentes: Google Fonts (Bricolage Grotesque y Figtree).

## Límites conocidos

- Pregón **no publica** en redes ni envía mensajes de WhatsApp. Genera textos y enlaces `wa.me`.
- No hay facturación: no se genera CFDI ni se muestra sello o folio fiscal. Timbrado: no conectado.
- Alcance, me gusta, guardados y clics: **no se leen solos**. Se capturan a mano o por CSV en Publicaciones y se marcan como capturados.
- Para contar clics reales al enlace hace falta un dominio propio con un enlace corto `https://tu-dominio/r/<REF>` que registre el clic y redirija a `wa.me`. No se puede hacer dentro de un artefacto de Claude. Al migrar, sería una ruta pequeña en el servidor (variable de entorno `TRACK_BASE_URL`).
- Lectura automática de alcance y me gusta: requiere conectar cada red con sus APIs y una cuenta autorizada (Meta, TikTok, Google). No está construido.
- En Claude, la base de datos solo está disponible para personas con sesión; las demás ven la app funcionando con almacenamiento local del navegador.
- El desglose de IVA en el Excel del contador es **referencial** (16 %).
