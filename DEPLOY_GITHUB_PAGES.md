# Publicar ToolHub en GitHub Pages + catálogo compartido

## 1. Subir ToolHub a GitHub

Sube **el contenido de esta carpeta**, no el ZIP como un único archivo. `index.html` debe quedar en la raíz del repositorio.

El proyecto ya incluye `.gitignore`; confirma que nunca subes un `.env` real ni `node_modules/`.

## 2. Activar GitHub Pages

En el repositorio:

1. **Settings**
2. **Pages**
3. En *Build and deployment*, selecciona **Deploy from a branch**
4. Branch: `main`
5. Folder: `/ (root)`
6. Guardar

## 3. Crear token de GitHub para el Worker

Crea un **Fine-grained personal access token** limitado solo al repositorio de ToolHub.

Permiso necesario:

- Repository permissions → **Contents: Read and write**

No copies ese token dentro de HTML/JS ni del repositorio.

## 4. Desplegar Cloudflare Worker

Abre una terminal dentro de `cloudflare-worker/` y sigue su `README.md`.

Debes configurar dos secretos con Wrangler:

```bash
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TOOLHUB_ADMIN_PASSWORD
```

La contraseña de administrador se introduce aquí como secreto. **No está guardada en este ZIP.**

## 5. Conectar ToolHub al Worker

Después del despliegue:

1. Abre `biblioteca-assets.html` en tu GitHub Pages.
2. Pulsa **Administrador**.
3. Pega la URL `https://...workers.dev` que te dio Cloudflare.
4. Introduce tu contraseña.
5. Pulsa **Conectar y desbloquear**.

A partir de ese momento:

- **Crear** publica en `data/assets.json`.
- La **X** elimina de `data/assets.json`.
- ToolHub publica automáticamente la URL pública del Worker en `data/assets-config.json`.
- Cuando esa configuración llegue a GitHub Pages, todos los visitantes consultarán el Worker directamente y verán el catálogo compartido sin depender del `localStorage`.
- El catálogo se refresca automáticamente cada minuto y al volver a la pestaña.

## 6. Migrar assets antiguos del navegador

Si ya habías creado assets con la versión basada en `localStorage`, ToolHub los detecta en el panel Administrador y ofrece **Migrar a GitHub**.
