import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_MODEL || "";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

app.disable("x-powered-by");
app.use(express.json({ limit: "96kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

const rateState = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const current = rateState.get(key);
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    rateState.set(key, { startedAt: now, count: 1 });
    return next();
  }
  current.count += 1;
  if (current.count > RATE_MAX) {
    return res.status(429).json({ error: "Has realizado demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo." });
  }
  next();
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}
function validHex(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? String(value).toUpperCase() : fallback;
}

const DEFAULTS = {
  primaryColor: "#731526", secondaryColor: "#1F4CFF", highlightColor: "#F8FBFF", shadowColor: "#03050A", rimColor: "#8135FF", accentColor: "#FF244F",
  lightX: -.34, lightY: -.52, lightSize: .38, lightFalloff: 1.2, ambient: .18, diffuse: .92, specular: 1.15, shininess: 88,
  secondaryLight: .25, secondaryLightOffset: .38, rim: .38, rimPower: 2.2, metallic: .72, roughness: .28, contrast: 1.38, saturation: 1.28,
  exposure: 0, gamma: 1, gradientBias: 0, vignette: .10, distortion: .42, swirl: .18, noise: .17, noiseScale: 1.6,
  rings: 0, ringFrequency: 2.6, bands: 0, bandAngle: 45, scratches: 0, spots: 0, hueShift: 0, iridescence: 0, iridescenceScale: 2.8,
  chromatic: 0, posterize: 0, fresnelTint: .25, centerX: 0, centerY: 0, zoom: 1, rotation: 0,
  overlayOpacity: 0, overlayScale: 1, overlayRotation: 0, overlayBlend: "softlight", outsideMode: "transparent", outsideColor: "#000000",
};

const LIMITS = {
  lightX: [-1,1], lightY: [-1,1], lightSize:[.05,1], lightFalloff:[.2,3], ambient:[0,1.2], diffuse:[0,2], specular:[0,2.5], shininess:[4,240],
  secondaryLight:[0,1.5], secondaryLightOffset:[0,1], rim:[0,1.8], rimPower:[.2,8], metallic:[0,1], roughness:[0,1], contrast:[.4,2.8], saturation:[0,2.8],
  exposure:[-1,1.5], gamma:[.4,2.2], gradientBias:[-1,1], vignette:[0,1], distortion:[0,1.5], swirl:[-2,2], noise:[0,1.5], noiseScale:[.1,5],
  rings:[0,1.5], ringFrequency:[.1,8], bands:[0,1.5], bandAngle:[0,360], scratches:[0,1], spots:[0,1], hueShift:[-180,180], iridescence:[0,1.5], iridescenceScale:[.1,8],
  chromatic:[0,1], posterize:[0,12], fresnelTint:[0,1.5], centerX:[-.5,.5], centerY:[-.5,.5], zoom:[.5,1.8], rotation:[-180,180],
  overlayOpacity:[0,1], overlayScale:[.25,5], overlayRotation:[-180,180],
};

function sanitizeParams(input = {}, base = DEFAULTS) {
  const source = { ...base, ...input };
  const params = {
    primaryColor: validHex(source.primaryColor, DEFAULTS.primaryColor),
    secondaryColor: validHex(source.secondaryColor, DEFAULTS.secondaryColor),
    highlightColor: validHex(source.highlightColor, DEFAULTS.highlightColor),
    shadowColor: validHex(source.shadowColor, DEFAULTS.shadowColor),
    rimColor: validHex(source.rimColor, DEFAULTS.rimColor),
    accentColor: validHex(source.accentColor, DEFAULTS.accentColor),
    outsideColor: validHex(source.outsideColor, DEFAULTS.outsideColor),
  };
  for (const [key, [min, max]] of Object.entries(LIMITS)) params[key] = clamp(source[key], min, max);
  params.posterize = Math.round(params.posterize);
  params.overlayBlend = ["softlight","multiply","screen","add","overlay"].includes(source.overlayBlend) ? source.overlayBlend : "softlight";
  params.outsideMode = ["transparent","solid"].includes(source.outsideMode) ? source.outsideMode : "transparent";
  return params;
}

function extractJson(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("La respuesta no contenía una configuración JSON válida.");
  return JSON.parse(raw.slice(start, end + 1));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function getOllamaModels() {
  try {
    const response = await fetchWithTimeout(`${OLLAMA_BASE}/api/tags`, { headers: { Accept: "application/json" } }, 2500);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.models) ? data.models.map((m) => String(m.name || m.model || "")).filter(Boolean) : [];
  } catch { return []; }
}

app.get("/api/health", async (req, res) => {
  const ollamaModels = await getOllamaModels();
  res.json({ ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), model: MODEL, ollamaAvailable: ollamaModels.length > 0, ollamaModels });
});

app.get("/api/ollama/models", async (req, res) => {
  const models = await getOllamaModels();
  if (!models.length) {
    return res.status(503).json({ available: false, models: [], error: "No se detectó Ollama con un modelo instalado en http://127.0.0.1:11434." });
  }
  res.json({ available: true, models });
});

const SYSTEM_PROMPT = `
Eres el asistente técnico de MatCap Studio Pro de ToolHub para Unity/VRChat.
Convierte una descripción visual en parámetros de un MatCap procedural.
Devuelve EXCLUSIVAMENTE JSON válido con este formato:
{
  "message":"explicación breve en español",
  "memory":"resumen breve de preferencias visuales, sin datos personales",
  "params": { ... }
}
Usa solo las claves que aparecen en currentMatcapParameters. Respeta tipos y rangos aproximados.
Interpreta estilos como agresivo, corrosivo, metal, mate, neon, vino, cyber, toxico, perla, holografico, lava, hielo, oro, suave, oscuro, arañazos, anillos, bandas e iridiscencia.
No añadas markdown ni texto fuera del JSON.
`;

app.post("/api/matcap/suggest", rateLimit, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "OpenAI no está configurado. Puedes usar gratis el modo local o instalar Ollama." });
  const prompt = String(req.body?.prompt || "").trim().slice(0, 1200);
  const memory = String(req.body?.memory || "").trim().slice(0, 2500);
  const currentParams = sanitizeParams(req.body?.currentParams || {});
  if (!prompt) return res.status(400).json({ error: "Escribe una descripción del MatCap." });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: JSON.stringify({ request: prompt, savedMatcapPreferences: memory || "Sin memoria previa.", currentMatcapParameters: currentParams }),
    });
    const parsed = extractJson(response.output_text);
    return res.json({ message: String(parsed.message || "Configuración aplicada.").slice(0, 500), memory: String(parsed.memory || "").slice(0, 2500), params: sanitizeParams(parsed.params || {}, currentParams) });
  } catch (error) {
    console.error("OpenAI MatCap error:", error);
    return res.status(500).json({ error: "No se pudo generar la configuración con OpenAI. Revisa la API key, cuota y conexión." });
  }
});

app.post("/api/matcap/ollama", rateLimit, async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim().slice(0, 1200);
  const memory = String(req.body?.memory || "").trim().slice(0, 2500);
  const currentParams = sanitizeParams(req.body?.currentParams || {});
  if (!prompt) return res.status(400).json({ error: "Escribe una descripción del MatCap." });
  const models = await getOllamaModels();
  if (!models.length) return res.status(503).json({ error: "No se detectó Ollama con modelos instalados. Instala Ollama y descarga un modelo primero." });
  const requested = String(req.body?.model || OLLAMA_DEFAULT_MODEL || "").trim();
  const model = models.includes(requested) ? requested : models[0];
  try {
    const response = await fetchWithTimeout(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: SYSTEM_PROMPT,
        prompt: JSON.stringify({ request: prompt, savedMatcapPreferences: memory || "Sin memoria previa.", currentMatcapParameters: currentParams }),
        stream: false,
        format: "json",
        options: { temperature: 0.35 },
      }),
    }, 120000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Ollama devolvió un error.");
    const parsed = extractJson(data.response || "");
    return res.json({ message: String(parsed.message || `Configuración creada con ${model}.`).slice(0,500), memory: String(parsed.memory || "").slice(0,2500), params: sanitizeParams(parsed.params || {}, currentParams), model });
  } catch (error) {
    console.error("Ollama MatCap error:", error);
    return res.status(500).json({ error: error?.name === "AbortError" ? "Ollama tardó demasiado en responder." : (error.message || "No se pudo conectar con Ollama.") });
  }
});

app.use(express.static(ROOT, { extensions: ["html"], index: "index.html" }));
app.listen(PORT, () => {
  console.log(`ToolHub: http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? `OpenAI activo (${MODEL})` : "OpenAI desactivado: usa modo local u Ollama si prefieres no usar API.");
  console.log(`Ollama local opcional: ${OLLAMA_BASE}`);
});
