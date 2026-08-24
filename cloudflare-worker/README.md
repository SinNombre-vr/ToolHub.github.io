# ToolHub Assets API — Cloudflare Worker

Este Worker permite que ToolHub use GitHub como catálogo compartido **sin base de datos**.

## Qué guarda

- Los metadatos públicos se guardan en `data/assets.json` del repositorio.
- Las previews y descargas siguen siendo enlaces externos.
- El Worker solo sirve para autenticar al propietario y hacer commits en GitHub.

## Secretos

Nunca pongas estos valores en `wrangler.toml` ni en GitHub:

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TOOLHUB_ADMIN_PASSWORD
```

`GITHUB_TOKEN` debe ser un **Fine-grained personal access token** limitado al repositorio de ToolHub, con permiso **Contents: Read and write**.

Cuando `wrangler` solicite `TOOLHUB_ADMIN_PASSWORD`, introduce tu contraseña de administrador. La contraseña no queda escrita en los archivos del proyecto.

## Configuración

Edita `wrangler.toml` y cambia:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` si no usas `main`
- `ALLOWED_ORIGIN` con la URL de GitHub Pages

## Desplegar

```bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TOOLHUB_ADMIN_PASSWORD
npm run deploy
```

Cloudflare devolverá una URL parecida a:

```text
https://toolhub-assets-api.<tu-subdominio>.workers.dev
```

En ToolHub abre **Biblioteca de Assets → Administrador** y pega esa URL. Tras verificar la contraseña, ToolHub publica automáticamente esa dirección en `data/assets-config.json` (no contiene secretos). Cuando GitHub Pages actualice, todos los visitantes leerán directamente desde el Worker y verán los cambios sin esperar un nuevo despliegue de Pages por cada asset.

## Flujo final

1. Todos leen `data/assets.json` desde GitHub Pages.
2. Tú desbloqueas Administrador contra el Worker.
3. Crear o eliminar hace un commit en `data/assets.json`.
4. GitHub Pages publica el cambio y todos lo ven.

No hay MySQL, PostgreSQL, Firebase, Supabase ni otro sistema de base de datos.
