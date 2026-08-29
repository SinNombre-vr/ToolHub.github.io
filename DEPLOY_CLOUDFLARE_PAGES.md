# ToolHub · Fase 1 · Cloudflare

Objetivo: mantener GitHub únicamente como repositorio y servir ToolHub públicamente desde Cloudflare.

## Arquitectura elegida

La interfaz actual de Cloudflare crea el proyecto mediante **Workers Builds + Static Assets**. Para ToolHub esto sustituye el despliegue clásico de Pages sin cambiar el objetivo de la Fase 1: el frontend se sirve como archivos estáticos desde la red de Cloudflare y GitHub queda solo como repositorio.

## Configuración del proyecto

- Repositorio: `SinNombre-vr/ToolHub.github.io`
- Producción: `main`
- Project name: `toolhub`
- Build command: `npm run build:pages`
- Deploy command: `npx wrangler deploy`
- Builds para ramas no productivas: activados
- Cloudflare Access: desactivado para la web pública

El archivo `wrangler.jsonc` declara `./dist` como directorio de Static Assets. Por tanto, el comando `npx wrangler deploy` publica exactamente el artefacto generado por el build.

El script `scripts/build-pages.mjs` genera un artefacto estático limpio en `dist/`. No publica `server.js`, dependencias Node, SQL de Supabase ni documentación interna de despliegue.

Durante el build también se eliminan referencias absolutas al antiguo origen `https://sinnombre-vr.github.io/ToolHub.github.io`, de modo que los enlaces internos funcionen en el nuevo origen de Cloudflare y posteriormente en un dominio propio sin volver a editar el frontend.

## Seguridad de estáticos

El build copia `_headers` a `dist/` para aplicar:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictiva para cámara, micrófono, geolocalización y pagos
- `X-Frame-Options: SAMEORIGIN`

## Compatibilidad actual

La producción actual de GitHub Pages es esencialmente estática. `server.js` se conserva en el repositorio para desarrollo/local y para las funciones opcionales de MatCap con OpenAI/Ollama, pero no forma parte del artefacto estático de Cloudflare. Esto mantiene paridad con la publicación actual mientras completamos la Fase 1.

Supabase continúa como backend externo. La nueva URL pública de Cloudflare deberá añadirse a las URLs permitidas de Supabase Auth antes del corte definitivo.

## Orden de migración

1. Preparar el repositorio y `wrangler.jsonc`.
2. Crear el proyecto de Cloudflare conectado al repositorio.
3. Ejecutar el primer deploy.
4. Validar portada, herramientas, guías, biblioteca, perfiles y Supabase.
5. Añadir la nueva URL a las URLs permitidas de Supabase Auth.
6. Probar registro, OTP, login y logout desde Cloudflare.
7. Declarar Cloudflare como producción.
8. Mantener GitHub Pages temporalmente como rollback.
9. Retirar GitHub Pages solo cuando la validación sea completa.

No se modifica todavía el sistema de login; eso corresponde a la Fase 2.
