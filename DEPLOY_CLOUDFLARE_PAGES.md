# ToolHub · Fase 1 · Cloudflare Pages

Objetivo: mantener GitHub únicamente como repositorio y servir ToolHub públicamente desde Cloudflare Pages.

## Configuración del proyecto

- Producción: `main`
- Framework preset: `None`
- Root directory: repositorio raíz
- Build command: `npm run build:pages`
- Build output directory: `dist`
- Despliegues automáticos: activados para `main`
- Preview deployments: activados para ramas/PR

El script `scripts/build-pages.mjs` genera un artefacto estático limpio en `dist/`. No publica `server.js`, dependencias Node, SQL de Supabase ni documentación interna de despliegue.

Durante el build también se eliminan referencias absolutas al antiguo origen `https://sinnombre-vr.github.io/ToolHub.github.io`, de modo que los enlaces internos funcionen en `*.pages.dev` y posteriormente en un dominio propio sin volver a editar el frontend.

## Seguridad de estáticos

Cloudflare Pages leerá `_headers` desde `dist/` y aplicará:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictiva para cámara, micrófono, geolocalización y pagos
- `X-Frame-Options: SAMEORIGIN`

## Compatibilidad actual

La producción actual de GitHub Pages es esencialmente estática. `server.js` se conserva en el repositorio para desarrollo/local y para las funciones opcionales de MatCap con OpenAI/Ollama, pero no forma parte del artefacto de Pages. Esto mantiene paridad con la publicación actual mientras completamos la Fase 1.

Supabase continúa como backend externo. La autenticación existente no fija el dominio de ToolHub dentro del frontend; el cambio de URL pública deberá añadirse en la configuración de URLs permitidas de Supabase antes del corte definitivo.

## Orden de migración

1. Fusionar la preparación de infraestructura.
2. Crear el proyecto de Cloudflare Pages conectado al repositorio.
3. Primer deploy en `*.pages.dev`.
4. Validar portada, herramientas, guías, biblioteca, perfiles y Supabase.
5. Añadir la nueva URL a las URLs permitidas de Supabase Auth.
6. Probar registro, OTP, login y logout desde Cloudflare.
7. Declarar Cloudflare como producción.
8. Mantener GitHub Pages temporalmente como rollback.
9. Retirar GitHub Pages solo cuando la validación sea completa.

No se modifica todavía el sistema de login; eso corresponde a la Fase 2.
