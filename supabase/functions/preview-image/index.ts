const ALLOWED_SITES = [
  "booth.pm",
  "gumroad.com",
  "payhip.com",
  "jinxxy.com",
  "sketchfab.com",
  "vrcmods.com",
  "itch.io",
  "ko-fi.com",
  "patreon.com",
  "cubebrush.co",
  "fab.com",
  "github.com"
];

const FRONTEND_ORIGIN = "https://sinnombre-vr.github.io";

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isCloudflareOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host.endsWith(".workers.dev") || host.endsWith(".pages.dev");
  } catch {
    return false;
  }
}

function isAllowedFrontendOrigin(origin: string) {
  return origin === FRONTEND_ORIGIN || isLocalOrigin(origin) || isCloudflareOrigin(origin);
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = !origin || isAllowedFrontendOrigin(origin)
    ? (origin || FRONTEND_ORIGIN)
    : FRONTEND_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function allowedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return ALLOWED_SITES.some((site) => host === site || host.endsWith(`.${site}`));
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function attrs(tag: string) {
  const result: Record<string, string> = {};
  const re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tag))) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function metaValue(html: string, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const a = attrs(tag);
    const key = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (wanted.has(key) && a.content) return a.content.trim();
  }
  return "";
}

function linkImage(html: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const a = attrs(tag);
    const rel = (a.rel || "").toLowerCase().split(/\s+/);
    if (rel.includes("image_src") && a.href) return a.href.trim();
  }
  return "";
}

function firstImage(html: string) {
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const a = attrs(tag);
    const candidate = a.src || a["data-src"] || a["data-original"] || "";
    if (candidate && !candidate.startsWith("data:") && !candidate.startsWith("blob:")) {
      return candidate.trim();
    }
  }
  return "";
}

function resolveHttpUrl(value: string, base: string) {
  if (!value) return "";
  try {
    const resolved = new URL(value, base);
    return ["http:", "https:"].includes(resolved.protocol) ? resolved.href : "";
  } catch {
    return "";
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json({ error: "Método no permitido." }, 405, origin);
  }

  if (origin && !isAllowedFrontendOrigin(origin)) {
    return json({ error: "Origen no autorizado." }, 403, origin);
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON no válido." }, 400, origin);
  }

  let target: URL;
  try {
    target = new URL(String(body.url || "").trim());
  } catch {
    return json({ error: "Enlace de origen no válido." }, 400, origin);
  }

  if (!["http:", "https:"].includes(target.protocol) || !allowedHost(target.hostname)) {
    return json({
      error: "Este sitio todavía no está incluido en la detección automática."
    }, 400, origin);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(target.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolHubPreview/1.0; +https://sinnombre-vr.github.io/ToolHub.github.io/)",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en;q=0.6"
      }
    });

    if (!response.ok) {
      return json({ error: `La página respondió HTTP ${response.status}.` }, 502, origin);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return json({ error: "La URL no devolvió una página HTML." }, 422, origin);
    }

    const html = (await response.text()).slice(0, 1_800_000);
    const finalUrl = response.url || target.href;

    const candidates: Array<[string, string]> = [
      ["og:image:secure_url", metaValue(html, ["og:image:secure_url"])],
      ["og:image", metaValue(html, ["og:image"])],
      ["twitter:image", metaValue(html, ["twitter:image", "twitter:image:src"])],
      ["itemprop:image", metaValue(html, ["image"])],
      ["image_src", linkImage(html)],
      ["primera imagen", firstImage(html)]
    ];

    for (const [source, value] of candidates) {
      const image = resolveHttpUrl(value, finalUrl);
      if (image) {
        const title = metaValue(html, ["og:title", "twitter:title"]);
        return json({ ok: true, image, source, title }, 200, origin);
      }
    }

    return json({ error: "No encontré una imagen principal utilizable en esa página." }, 404, origin);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return json({ error: "La página tardó demasiado en responder." }, 504, origin);
    }
    console.error(error);
    return json({ error: "No se pudo leer la página de origen." }, 502, origin);
  } finally {
    clearTimeout(timeout);
  }
});
