# ToolHub · preview-image

Edge Function usada por la Biblioteca de Assets para detectar automáticamente la imagen principal de una página de origen.

## Desplegar desde Supabase Dashboard

1. Abre el proyecto ToolHub en Supabase.
2. Ve a **Edge Functions**.
3. Pulsa **Deploy a new function** → **Via Editor**.
4. Nombre de la función: `preview-image`.
5. Sustituye el código del editor por el contenido de `supabase/functions/preview-image/index.ts` de este repositorio.
6. Pulsa **Deploy function**.

No necesita `service_role`, secretos ni contraseñas. ToolHub la invoca desde el navegador usando la Publishable Key pública del proyecto.

## Sitios incluidos

BOOTH, Gumroad, Payhip, Jinxxy, Sketchfab, VRCMods, itch.io, Ko-fi, Patreon, Cubebrush, Fab y GitHub.

La función busca, por orden, `og:image`, `twitter:image`, `image_src` y finalmente una imagen HTML utilizable.
