(() => {
  "use strict";

  const originInput = document.querySelector("#assetAuthorUrl");
  const previewInput = document.querySelector("#assetPreview");
  const form = document.querySelector("#assetForm");
  if (!originInput || !previewInput || !form) return;

  const config = window.TOOLHUB_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const previewLabel = previewInput.closest("label");
  if (!previewLabel) return;

  const title = previewLabel.querySelector(":scope > span");
  if (title) title.textContent = "Preview / imagen (automática)";
  previewInput.placeholder = "Se intentará detectar desde la página de origen";

  const controls = document.createElement("div");
  controls.className = "asset-preview-auto-controls asset-form-wide";
  controls.innerHTML = `
    <button class="asset-preview-auto-button" id="assetPreviewDetect" type="button">🔎 Detectar imagen</button>
    <span class="asset-preview-auto-status" id="assetPreviewDetectStatus">Pega el enlace de autor/origen y ToolHub intentará obtener la imagen principal.</span>
  `;
  previewLabel.insertAdjacentElement("afterend", controls);

  const button = controls.querySelector("#assetPreviewDetect");
  const status = controls.querySelector("#assetPreviewDetectStatus");
  let timer = null;
  let lastDetectedUrl = "";
  let requestId = 0;

  function safeUrl(value) {
    try {
      const parsed = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function setStatus(text, mode = "") {
    status.textContent = text;
    status.className = "asset-preview-auto-status" + (mode ? ` ${mode}` : "");
  }

  async function detectPreview({ force = false } = {}) {
    const sourceUrl = safeUrl(originInput.value);
    if (!sourceUrl) {
      if (force) setStatus("Introduce primero un enlace de autor/origen válido.", "error");
      return;
    }

    if (!force && previewInput.value.trim()) return;
    if (!force && sourceUrl === lastDetectedUrl) return;

    const thisRequest = ++requestId;
    button.disabled = true;
    setStatus("Buscando imagen principal…");

    // La función se desplegó inicialmente con el slug "smooth-function".
    // Cambiar el Name visible en Supabase no cambia el endpoint/slug.
    const { data, error } = await client.functions.invoke("smooth-function", {
      body: { url: sourceUrl }
    });

    if (thisRequest !== requestId) return;
    button.disabled = false;

    if (error || !data?.image) {
      const message = data?.error || error?.message || "No se pudo detectar una imagen automáticamente.";
      setStatus(`${message} Puedes pegar una preview manualmente.`, "error");
      lastDetectedUrl = sourceUrl;
      return;
    }

    previewInput.value = data.image;
    previewInput.dispatchEvent(new Event("input", { bubbles: true }));
    previewInput.dispatchEvent(new Event("change", { bubbles: true }));
    lastDetectedUrl = sourceUrl;
    setStatus(`✓ Imagen detectada${data.source ? ` · ${data.source}` : ""}`, "ok");
  }

  function scheduleDetection() {
    clearTimeout(timer);
    timer = setTimeout(() => detectPreview({ force: false }), 650);
  }

  originInput.addEventListener("input", () => {
    if (safeUrl(originInput.value) !== lastDetectedUrl) lastDetectedUrl = "";
    scheduleDetection();
  });

  originInput.addEventListener("paste", () => {
    clearTimeout(timer);
    timer = setTimeout(() => detectPreview({ force: false }), 100);
  });

  originInput.addEventListener("blur", () => detectPreview({ force: false }));
  button.addEventListener("click", () => detectPreview({ force: true }));

  form.addEventListener("reset", () => {
    clearTimeout(timer);
    requestId += 1;
    lastDetectedUrl = "";
    button.disabled = false;
    setTimeout(() => {
      setStatus("Pega el enlace de autor/origen y ToolHub intentará obtener la imagen principal.");
    }, 0);
  });
})();
