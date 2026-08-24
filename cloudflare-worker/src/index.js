const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "toolhub-assets-api" }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/assets") {
        const { assets } = await loadCatalog(env);
        return json({ assets }, 200, { ...cors, "cache-control": "no-store" });
      }

      if (request.method === "POST" && url.pathname === "/admin/verify") {
        await requireAdmin(request, env);
        return json({ ok: true }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/admin/publish-config") {
        await requireAdmin(request, env);
        const publicApi = url.origin;
        await writePublicConfig(env, publicApi);
        return json({ ok: true, apiBase: publicApi }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/assets") {
        await requireAdmin(request, env);
        const input = await request.json().catch(() => null);
        const asset = validateAsset(input);

        let created;
        await mutateCatalog(env, (assets) => {
          created = {
            ...asset,
            id: `asset-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
            createdAt: new Date().toISOString()
          };
          assets.unshift(created);
          return assets;
        }, `ToolHub: publicar ${asset.name}`);

        return json({ ok: true, asset: created }, 201, cors);
      }

      if (request.method === "DELETE" && url.pathname.startsWith("/assets/")) {
        await requireAdmin(request, env);
        const id = decodeURIComponent(url.pathname.slice("/assets/".length));
        if (!id) return json({ error: "ID requerido." }, 400, cors);

        let removed = null;
        await mutateCatalog(env, (assets) => {
          const index = assets.findIndex((asset) => asset.id === id);
          if (index < 0) throw httpError(404, "Asset no encontrado.");
          removed = assets[index];
          assets.splice(index, 1);
          return assets;
        }, `ToolHub: eliminar ${id}`);

        return json({ ok: true, removed }, 200, cors);
      }

      return json({ error: "Ruta no encontrada." }, 404, cors);
    } catch (error) {
      console.error(error);
      const status = Number(error?.status) || 500;
      const message = status >= 500 ? "Error interno del servicio." : String(error?.message || "Error.");
      return json({ error: message }, status, cors);
    }
  }
};

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const configured = String(env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = configured.includes("*")
    ? "*"
    : configured.includes(origin)
      ? origin
      : configured[0] || "*";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function requireAdmin(request, env) {
  if (!env.TOOLHUB_ADMIN_PASSWORD) throw httpError(500, "Falta configurar TOOLHUB_ADMIN_PASSWORD.");
  const auth = request.headers.get("authorization") || "";
  const password = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!password || !(await secureEqual(password, env.TOOLHUB_ADMIN_PASSWORD))) {
    throw httpError(401, "Contraseña incorrecta.");
  }
}

async function secureEqual(a, b) {
  const encoder = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(a))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(b)))
  ]);
  const aa = new Uint8Array(ha);
  const bb = new Uint8Array(hb);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.min(aa.length, bb.length); i += 1) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function validateAsset(input) {
  if (!input || typeof input !== "object") throw httpError(400, "Datos del asset no válidos.");

  const asset = {
    name: text(input.name, 90, true, "Nombre"),
    category: text(input.category || "Otro", 40, true, "Categoría"),
    author: text(input.author || "", 70, false, "Autor"),
    platform: text(input.platform || "No especificado", 40, true, "Compatibilidad"),
    authorUrl: url(input.authorUrl, true, "Enlace de autor/origen"),
    preview: url(input.preview || "", false, "Preview"),
    downloadUrl: url(input.downloadUrl, true, "Enlace de descarga"),
    tags: tags(input.tags),
    description: text(input.description || "", 500, false, "Descripción")
  };

  return asset;
}

function text(value, max, required, label) {
  const result = String(value ?? "").trim();
  if (required && !result) throw httpError(400, `${label} es obligatorio.`);
  if (result.length > max) throw httpError(400, `${label} supera ${max} caracteres.`);
  return result;
}

function url(value, required, label) {
  const raw = String(value ?? "").trim();
  if (!raw && !required) return "";
  if (!raw && required) throw httpError(400, `${label} es obligatorio.`);

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch {
    throw httpError(400, `${label} debe ser una URL http/https válida.`);
  }
}

function tags(value) {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 32)))].slice(0, 20);
}

function githubConfig(env) {
  const owner = String(env.GITHUB_OWNER || "").trim();
  const repo = String(env.GITHUB_REPO || "").trim();
  const branch = String(env.GITHUB_BRANCH || "main").trim();
  const path = String(env.CATALOG_PATH || "data/assets.json").trim();
  const token = String(env.GITHUB_TOKEN || "").trim();

  if (!owner || !repo || !token) {
    throw httpError(500, "Falta configurar GitHub en el Worker.");
  }

  return { owner, repo, branch, path, token };
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ToolHub-Assets-Worker"
  };
}

async function loadCatalog(env) {
  const cfg = githubConfig(env);
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const response = await fetch(endpoint, { headers: githubHeaders(cfg.token) });

  if (response.status === 404) return { assets: [], sha: null, cfg };
  if (!response.ok) throw httpError(502, `GitHub respondió ${response.status} al leer el catálogo.`);

  const payload = await response.json();
  const decoded = base64ToUtf8(String(payload.content || "").replace(/\s+/g, ""));
  const parsed = JSON.parse(decoded || "[]");
  if (!Array.isArray(parsed)) throw httpError(500, "data/assets.json debe contener un array JSON.");

  return { assets: parsed, sha: payload.sha || null, cfg };
}

async function writeCatalog(env, assets, sha, message, cfg = null) {
  cfg ||= githubConfig(env);
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.path)}`;
  const body = {
    message,
    content: utf8ToBase64(JSON.stringify(assets, null, 2) + "\n"),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { ...githubHeaders(cfg.token), "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = httpError(response.status === 409 || response.status === 422 ? 409 : 502,
      payload?.message || `GitHub respondió ${response.status} al guardar el catálogo.`);
    throw error;
  }

  return response.json();
}

async function mutateCatalog(env, mutate, message) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await loadCatalog(env);
    const next = mutate(current.assets.slice());

    try {
      await writeCatalog(env, next, current.sha, message, current.cfg);
      return next;
    } catch (error) {
      if (error.status === 409 && attempt === 0) continue;
      throw error;
    }
  }
  throw httpError(409, "El catálogo cambió mientras se guardaba. Inténtalo de nuevo.");
}

async function readGithubJsonFile(env, path, fallback) {
  const cfg = githubConfig(env);
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const response = await fetch(endpoint, { headers: githubHeaders(cfg.token) });

  if (response.status === 404) return { value: fallback, sha: null, cfg };
  if (!response.ok) throw httpError(502, `GitHub respondió ${response.status} al leer ${path}.`);

  const payload = await response.json();
  const decoded = base64ToUtf8(String(payload.content || "").replace(/\s+/g, ""));
  return { value: JSON.parse(decoded), sha: payload.sha || null, cfg };
}

async function writeGithubJsonFile(env, path, value, sha, message, cfg = null) {
  cfg ||= githubConfig(env);
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(path)}`;
  const body = {
    message,
    content: utf8ToBase64(JSON.stringify(value, null, 2) + "\n"),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { ...githubHeaders(cfg.token), "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw httpError(502, payload?.message || `GitHub respondió ${response.status} al guardar ${path}.`);
  }
}

async function writePublicConfig(env, apiBase) {
  const path = String(env.ASSET_CONFIG_PATH || "data/assets-config.json").trim();
  const current = await readGithubJsonFile(env, path, { apiBase: "" });
  if (current.value?.apiBase === apiBase) return;
  await writeGithubJsonFile(env, path, { apiBase }, current.sha, "ToolHub: configurar API pública", current.cfg);
}

function base64ToUtf8(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
