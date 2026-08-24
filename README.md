# ToolHub

ToolHub es una web multiherramienta con utilidades y guías para imágenes, PDF, Unity, VRChat, Discord, PC y VR.

**Propietario único:** 匚尺丨丂.

## Herramientas de imagen

- Conversor PNG / JPG / WEBP
- Redimensionar imágenes
- Comprimir imágenes
- Generador de gradientes
- Generador de MatCap

## Herramientas PDF

- Dividir PDF
- Unir PDF
- Optimizar PDF
- PDF a Word
- Editar PDF
- Firmar PDF (firma visual)
- Marca de agua

Las herramientas PDF están diseñadas para procesar los archivos localmente en el navegador. Los documentos no se envían a servidores de ToolHub.

### Dependencias PDF del navegador

Las páginas PDF cargan versiones fijadas desde jsDelivr:

- `pdf-lib` 1.17.1
- `pdfjs-dist` 3.11.174
- `JSZip` 3.10.1

Esto permite que el repositorio siga siendo pequeño y sea compatible con publicación estática, incluido GitHub Pages. Las librerías se descargan al navegador; los PDF del usuario no se envían a jsDelivr.

## Asistente de MatCap: gratis local, Ollama u OpenAI

**MatCap Studio Pro funciona sin pagar y sin conectar ninguna IA.** El modo `Gratis local` interpreta descripciones mediante reglas ejecutadas en el navegador.

Para una IA generativa real sin clave de API se puede instalar **Ollama** en el propio PC y ejecutar ToolHub con Node.js. OpenAI sigue disponible como alternativa opcional si en el futuro se configura una clave.

```bash
npm install
npm start
```

Nunca publiques el archivo `.env`. La plantilla segura está en `.env.example`.

## GitHub

El repositorio puede publicarse sin `node_modules` ni `.env`.

`.gitignore` debe mantener al menos:

```gitignore
.env
node_modules/
npm-debug.log*
```

## Privacidad

ToolHub utiliza almacenamiento local del navegador para recordar la aceptación del aviso de privacidad y, si el usuario lo activa, las preferencias del Generador de MatCap.

La política mostrada en la web debe revisarse antes de añadir analítica, formularios, cuentas, almacenamiento en servidor o nuevos terceros.

## Propiedad

© 匚尺丨丂. Todos los derechos reservados.


## Cambios v8 en PDF

- Firma PDF rediseñada: firma mediante **texto o imagen**.
- Editor PDF rediseñado:
  - texto multilínea;
  - varios cambios antes de exportar;
  - selección visual para tapar zonas arrastrando sobre la página;
  - rotación de páginas;
  - vista previa de cambios.
- Compatibilidad mejorada con PDF que llevan restricciones/permisos internos.
- Los PDF que exigen contraseña siguen requiriendo desbloqueo previo.
- Marca de agua:
  - texto;
  - imagen;
  - texto e imagen al mismo tiempo;
  - posición predefinida o personalizada;
  - vista previa de posición.

### Nota sobre cifrado/protección

ToolHub usa `pdf-lib` con un segundo intento mediante `ignoreEncryption: true` cuando detecta restricciones internas. Esto permite trabajar con algunos PDF que están marcados como cifrados por permisos, pero **no descifra PDF protegidos por contraseña**.



## Cambios v9 en PDF

- Eliminado el uso de `ignoreEncryption: true` como solución de escritura: podía abrir algunos PDF pero dejarlos en un estado no editable.
- Nuevo modo de compatibilidad automático: PDF.js renderiza las páginas y ToolHub reconstruye un PDF nuevo cuando detecta restricciones internas.
- Esto evita errores internos como `Expected instance of ..., but got instance of undefined`.
- Los PDF que requieren contraseña siguen necesitando desbloqueo previo.
- En Editor PDF, los cambios agregados ahora tienen botón **Editar**. El texto, tamaño, color, página y posición se pueden modificar y guardar antes de generar el PDF final.
- La reconstrucción de compatibilidad puede perder texto seleccionable porque usa una representación visual de las páginas.


## Cambios v10 — calidad de PDF

Se corrigió la pérdida excesiva de calidad que podía aparecer al editar, firmar,
dividir, unir o añadir marcas de agua a PDF con restricciones internas.

### Causa

Algunos PDF no pueden ser modificados directamente con `pdf-lib`.
ToolHub usa entonces un modo de compatibilidad basado en PDF.js que reconstruye
visualmente las páginas.

En v9 ese modo utilizaba:

- escala de renderizado `1.0x`;
- JPEG al `90%`.

Eso era insuficiente para texto pequeño.

### v10

El modo compatible usa ahora:

- escala de renderizado `2.4x`;
- JPEG al `98%`;
- renderizado con intención de impresión;
- tamaño físico original de página;
- liberación de memoria entre páginas.

Las herramientas distintas de **Optimizar PDF** priorizan legibilidad y calidad
aunque el archivo resultante pueda pesar más.

### Limitación del modo compatible

Al reconstruir un PDF restringido, la página pasa a ser una imagen de alta resolución.
Por ello:

- la apariencia se conserva con mucha más nitidez;
- el texto original puede dejar de ser seleccionable;
- el PDF puede aumentar de tamaño.

Los PDF que `pdf-lib` puede modificar directamente siguen conservando su estructura
vectorial original y no pasan por este modo.


## v12 — Generales / Calculadora

- La tarjeta `Calculadoras` pasa a llamarse `Generales`.
- Se conserva el resto de herramientas y secciones sin eliminarlas ni sustituirlas.
- `Calculadora` se abre como ventana emergente.
- Incluye modo básico y científico, DEG/RAD, historial y teclado.
- La calculadora usa un parser matemático propio y no utiliza `eval()`.


## v13 — Discord

Se conserva `Herramientas para Discord` y se añade un aviso emergente específico que
explica que las herramientas, bots y consejos relacionados con Discord se ofrecen con
carácter informativo y están basados en opinión y experiencia propia.

También se añade:

- **Bots para Discord** → abre `https://top.gg/` en una pestaña nueva.

El enlace externo utiliza `rel="noopener noreferrer"`.

No se han eliminado ni sustituido otras herramientas, tarjetas o guías.


## v14 — Herramientas Discord funcionales

Se mantienen:

- Herramientas para Discord
- Bots para Discord → Top.gg

Y se añaden cuatro herramientas en ventanas emergentes:

### Constructor de Embeds
- Autor
- Título
- Descripción
- Color
- Footer
- Imagen
- Miniatura
- Hasta 25 campos
- Campos inline
- Vista previa tipo Discord
- Copiar JSON
- Descargar JSON

### Generador de estructura de servidor
- Presets: comunidad, gaming, VRChat, creador y estudio/proyecto
- Entrada/reglas
- Canales de voz
- Staff
- Bots
- Logs
- Copiar estructura
- Descargar TXT

### Generador de roles y permisos
- Roles personalizados
- Color
- Jerarquía
- Permisos
- Avisos para permisos sensibles
- Preset base
- Copiar configuración

### Checklist de seguridad para Discord
- 10 comprobaciones
- Progreso
- Guardado local con localStorage
- Reiniciar checklist
- Copiar informe

No se han eliminado otras herramientas, tarjetas ni guías.


## v15 — VRChat

Se conserva `Herramientas para VRChat`, que ahora abre un aviso específico sobre recomendaciones y software de terceros.

Se añaden:
- Oficial VRChat
- VRCX
- MagicChatbox
- OVR Advanced Settings con guía y enlace a Steam
- Virtual Desktop con guía, web oficial y enlace de Virtual Desktop Classic en Steam

No se han eliminado otras tarjetas, herramientas ni guías.


## v16 — Unity

Se conserva `Herramientas para Unity`, ahora con aviso específico sobre software de
terceros, compatibilidad y copias de seguridad.

Se añaden:
- Webs de avatares y assets: Sketchfab, VRCMods, BOOTH, Jinxxy y Gumroad.
- Herramientas: Unity compatible con VRChat, VCC, FACS Utilities, Poiyomi Toon Shader,
  lilToon, VRCFury, HierarchyPlus, VRCSDK+, World Constraint, Modular Avatar,
  wholesome© SPS Configurator y DressingTools.

No se incluyen enlaces directos a sitios centrados en contenido ripeado o distribuido sin permiso.

No se han eliminado otras tarjetas, herramientas ni guías.


## v16.1 — Corrección lilToon

- El enlace de lilToon se actualiza a:
  https://lilxyzw.github.io/lilToon/

No se han modificado ni eliminado otras herramientas, tarjetas, guías o enlaces.


## v16.2 — Iconos y nuevas webs Unity

- Se añaden iconos locales a Sketchfab, VRCMods, BOOTH, Jinxxy y Gumroad.
- Se añade Nexyy con icono proporcionado por el usuario y enlace https://nexyy.com/.
- Se añade Payhip Marketplace con enlace https://payhip.com/marketplace.
- Los iconos se guardan dentro del repositorio para evitar depender de hotlinks externos en tiempo de ejecución.
- No se eliminan otras herramientas, tarjetas ni guías.

## v16.5 — Limpieza Unity

Se retiraron completamente de ToolHub las referencias a RipperStore, VRCPirate y VRModels,
incluidos sus botones, modal informativo, estilos, JavaScript e iconos asociados.

El resto del proyecto se mantiene sin cambios.

## v16.6 — Guías y tutoriales

La sección Guías y tutoriales queda únicamente con:

- Unity
- VR

Se eliminan de esta sección las guías PC y Discord.

Unity queda organizado en:

- Optimizar texturas
- Poiyomi
- lilToon
- Materiales
- Texturas: MatCap, Masks, Normal Maps, etc.
- Reducir luces
- Shaders: crearlos y usarlos
- Hierarchy, Scene, Inspector, Animation, Animator, Project, SDK, etc.

La guía VR se conserva exactamente como estaba.
El resto de ToolHub no se modifica.

## v17 — Shader Studio + MatCap Studio Pro

- Añadido `Unity → Herramientas → Generador de Shaders · Shader Studio`.
- Generación local de archivos `.shader` para Unity Built-in / PC con preview animada.
- Soporta texturas de preview, Normal Map, Emission, Rim/Fresnel, MatCap, Dissolve, Hue Shift, UV Scroll, UV Rotation, Pulse y Vertex Wave.
- MatCap actualizado a **MatCap Studio Pro** con una cantidad mucho mayor de controles: iluminación doble, roughness, exposición, gamma, patrones, ruido, remolino, anillos, bandas, arañazos, manchas, iridiscencia, aberración cromática, posterización, encuadre y textura overlay.
- Exportación MatCap hasta 4096 × 4096, JSON de configuración, preset local, recuperación y aleatorización.
- Nuevo asistente **Gratis local** que funciona sin API ni servidor. No es un LLM: interpreta estilos y parámetros mediante reglas locales.
- Integración opcional con **Ollama** para usar un modelo de IA real ejecutado en el propio PC sin clave de API.
- OpenAI se conserva como opción adicional, no obligatoria.

### Ollama opcional

1. Instala Ollama en Windows.
2. Descarga al menos un modelo con Ollama.
3. Ejecuta ToolHub con `npm start`.
4. En MatCap Studio Pro selecciona `Ollama · IA local gratuita` y pulsa `Detectar Ollama`.

La API local de Ollama se busca por defecto en `http://127.0.0.1:11434`. Puede cambiarse con `OLLAMA_BASE_URL` en `.env`.

## v17.1 — Shader Studio en el inicio de Unity

El acceso a Generador de Shaders / Shader Studio se mueve desde el popup
"Herramientas" a la tarjeta principal de Unity.

La herramienta, sus archivos, preview, generación de shaders y demás funciones
permanecen intactas.

El resto de ToolHub no se modifica.

## v17.2 — Guías VR visuales

La guía VR deja de ser una lista de textos planos y pasa a tres páginas visuales:

- Conectividad y PCVR
- SteamVR
- Full Body Tracking

Las páginas incluyen índice lateral adaptable, barra de progreso de lectura, resúmenes,
tarjetas comparativas, pasos numerados, avisos por tipo, acordeones de problemas,
referencias externas y controles interactivos. FBT incluye selector visual de 5/6/8/10 trackers.

La guía Unity y el resto de herramientas de ToolHub permanecen sin cambios.

## v17.3 — Inicio / Hero profesional

Se actualiza exclusivamente la sección principal del inicio:

- El hero es más ancho que el resto del contenido.
- Se añade una superficie visual muy sutil para diferenciarlo sin convertirlo en una tarjeta pesada.
- El título principal incorpora profundidad mediante sombra.
- Se añade un barrido de luz lento y discreto sobre el texto.
- Se respeta `prefers-reduced-motion`.
- Se ajusta el comportamiento para tablet y móvil.

No se han modificado herramientas, guías, tarjetas ni funcionalidades.

## v17.3.1 — Separación superior del hero

Se añade espacio entre la barra de navegación y el hero principal:

- Escritorio: 28 px
- Tablet: 20 px
- Móvil: 14 px

No se modifica ninguna otra parte visual ni funcional.

## v17.3.2 — Espaciado proporcionado del hero

Se reajusta exclusivamente la separación entre la barra superior y el hero
para equilibrarla visualmente con el espacio existente debajo del hero.

- Escritorio: 72 px
- Tablet: 42 px
- Móvil: 24 px

No se cambia el tamaño del hero ni ninguna herramienta, guía o funcionalidad.

## v18 — Biblioteca de Assets VRChat

Se añade una nueva sección entre Guías y el footer:

- Biblioteca de Assets VRChat
- Página independiente `biblioteca-assets.html`
- Crear fichas con nombre, categoría, autor, compatibilidad, enlace, preview, tags y notas
- Buscar por nombre, autor, descripción o tags
- Filtrar por categoría, plataforma y tags
- Estadísticas de assets, tags y categorías
- Panel administrador
- Contraseña local configurable
- Botón Eliminar visible solo con modo administrador desbloqueado
- Persistencia local mediante `localStorage`

### Importante sobre GitHub Pages

Esta primera versión guarda el catálogo en el navegador local. GitHub Pages es estático y no
puede modificar archivos del repositorio de forma segura usando únicamente HTML/JavaScript.

El bloqueo por contraseña sirve para la interfaz local; no es una protección real de un repositorio
público. Para una biblioteca sincronizada entre usuarios con edición real desde la web será necesario
un backend o una integración segura con la API de GitHub sin exponer credenciales.

## v18.1 — Ajustes Biblioteca de Assets

- La sección de Biblioteca de Assets del inicio usa el mismo ancho máximo que el resto del contenido.
- Al abrir `biblioteca-assets.html` no aparece ningún formulario automáticamente.
- Inicialmente solo se muestran las acciones Crear, Buscar y Filtrar.
- El panel correspondiente aparece únicamente al pulsar una de esas acciones.
- El formulario de creación separa:
  1. Enlace de autor / origen
  2. Preview / imagen
  3. Enlace de descarga
- Las tarjetas muestran botones independientes para Autor / Origen y Descargar.
- Se mantiene compatibilidad de lectura con fichas creadas en la v18 que usaban un único campo `url`.

## v18.2 — Modo Administrador simplificado

El modo administrador queda dedicado exclusivamente a eliminar publicaciones:

- La contraseña queda fijada mediante comparación SHA-256 en JavaScript.
- Al desbloquear el modo administrador aparece una X en la esquina superior derecha de cada tarjeta.
- La X desaparece al bloquear el modo administrador.
- Se elimina el botón inferior "Eliminar".
- Se elimina la opción de modificar la contraseña desde la interfaz.
- Antes de eliminar una publicación se solicita confirmación.

Nota: en GitHub Pages este control protege únicamente la interfaz/localStorage. No constituye
seguridad fuerte para un repositorio público ni permite borrar archivos del repositorio.

## v18.2.1 — Preview sin texto VR

Se elimina el texto "VR" que aparecía cuando una tarjeta no tenía preview válida.

Ahora, cuando no existe imagen o no carga, se muestra únicamente un fondo oscuro y sutil,
sin letras ni iconos.

No se modifica ninguna otra función de la Biblioteca de Assets ni de ToolHub.

## v18.2.2 — Fallback personalizado

Cuando una tarjeta no tiene preview válida, en lugar de dejar el espacio vacío
se muestra el texto estilizado:

匚尺丨丂

Se conserva el fondo oscuro de la preview y no se modifica ninguna otra función.

## v18.2.3 — Identidad del propietario

Se sustituye el nombre real del propietario en todo ToolHub por:

`匚尺丨丂`

La propiedad del proyecto se mantiene indicada como propietario único.
No se modifica ninguna otra herramienta, guía, biblioteca o funcionalidad.

## v19 — Guías Unity completas

Se completa el bloque de Guías Unity con ocho páginas visuales e independientes:

- Optimizar texturas
- Poiyomi
- lilToon
- Materiales
- Texturas: MatCap, Masks, Normal Maps y más
- Reducir luces
- Shaders: crearlos y usarlos
- Hierarchy, Scene, Inspector, Animation, Animator, Project, SDK y más

Características:
- Índice lateral
- Barra de progreso
- Tarjetas visuales
- Pasos numerados
- Comparativas
- Avisos
- Acordeones de problemas frecuentes
- Fuentes oficiales
- Responsive móvil/escritorio
- Modo claro/oscuro compartido

La tarjeta Unity del inicio pasa a utilizar accesos visuales ricos, igual que el bloque VR.

Se mantiene la versión actual soportada por VRChat indicada como Unity 2022.3.22f1.
El resto de ToolHub permanece intacto.

## v19.1 — Normal Map Studio Pro

Se añade una nueva herramienta profesional dentro de Imágenes:

- Carga local PNG/JPG/WEBP/BMP
- Imagen original en preview
- Mapa de altura en tiempo real
- Normal Map RGB en tiempo real
- Preview de relieve con iluminación interactiva
- Arrastre directo de la luz sobre la preview
- Selección de canal de altura
- Black/White Point
- Auto Levels
- Contraste y gamma
- Invertir altura
- Fuerza/profundidad
- Blur previo
- Escala de muestreo
- Invertir canal X y canal Y
- Bordes Clamp o Wrap para texturas tileables
- Presets para piel, tela, grabado, piedra, tatuajes y detalle nítido
- Preview con color original, gris o height
- Ambiente, intensidad, especular y dureza de preview
- Exportación Normal Map PNG
- Exportación Height Map PNG
- Resolución original / 512 / 1024 / 2048 / 4096
- Guardar y cargar configuración JSON
- Integración en el switcher de herramientas de imagen
- Acceso desde la guía Unity de texturas

Todo el procesamiento se realiza localmente en el navegador.
El resto de ToolHub permanece intacto.

## v19.2 — Normal Map Advanced Lab

Actualización aditiva sobre Normal Map Studio Pro.

El archivo original `herramientas/imagenes/normal-map.js` se conserva intacto.
Las funciones nuevas viven en `normal-map-advanced.js`.

Se añade:

- Preview 3D WebGL real con esfera, cubo y plano
- Rotación manual y automática del modelo
- Comparador Antes / Después con deslizador
- Comparador visual de canales Luma/R/G/B/Alpha/Promedio
- Carga de Height Map externo
- Editor manual de Height Map
  - Elevar
  - Hundir
  - Suavizar
  - Borrar corrección
- Separación de detalle Macro / Medio / Micro
- Edge Seam Fix para texturas tileables
- Segundo Normal Map de detalle
- Mezcla RNM / Whiteout / Linear
- Inversión Y independiente del Normal secundario
- Normal avanzado y Normal combinado
- Tile Preview 2x2 / 3x3 / 4x4
- Undo / Redo
- Snapshots A / B
- Zoom de previews
- Información técnica en vivo
- Estimación de memoria RGBA
- Perfil de importación Unity / VRChat PC / Quest
- Copiar ajustes recomendados
- Procesamiento Batch a ZIP con JSZip
- Exportación del Normal combinado

Las funciones avanzadas se añaden sin sustituir el flujo principal que ya funcionaba.

## v19.4 — Biblioteca compartida sin base de datos

La Biblioteca de Assets deja de depender de `localStorage` como fuente principal.

- Catálogo público: `data/assets.json`
- Lectura para todos desde GitHub Pages
- Escritura segura mediante Cloudflare Worker + GitHub Contents API
- Credenciales almacenadas únicamente como secretos del Worker
- Crear requiere autenticación de administrador
- La X elimina la publicación del catálogo compartido
- Auto-refresh del catálogo
- Fallback local si GitHub no responde
- Migración de publicaciones antiguas de `localStorage` a GitHub
- No usa base de datos tradicional

Consulta `DEPLOY_GITHUB_PAGES.md` y `cloudflare-worker/README.md`.

