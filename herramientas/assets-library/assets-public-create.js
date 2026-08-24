(() => {
  "use strict";

  const API_STORAGE_KEY = "toolhub_asset_api_base_v1";
  const PUBLIC_CONFIG_URL = "data/assets-config.json";

  const form = document.querySelector("#assetForm");
  const publishButton = document.querySelector("#assetPublishButton");
  const syncStatus = document.querySelector("#catalogSyncStatus");
  if (!form || !publishButton) return;

  // La creación es pública; el administrador queda reservado al borrado.
  const style = document.createElement("style");
  style.textContent = `
    .asset-form.is-locked { opacity: 1 !important; }
    .asset-form.is-locked #assetPublishButton::after { content: "" !important; }
  `;
  document.head.appendChild(style);

  const keepPublic = () => form.classList.remove("is-locked");
  keepPublic();
  new MutationObserver(keepPublic).observe(form, { attributes: true, attributeFilter: ["class"] });

  function safeUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function cleanApiBase(value) {
    const url = safeUrl(value);
    return url ? url.replace(/\/+$/, "") : "";
  }

  function normalizeTags(value) {
    return [...new Set(String(value || "")
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean))].slice(0, 20);
  }

  async function getApiBase() {
    const saved = cleanApiBase(localStorage.getItem(API_STORAGE_KEY) || "");
    if (saved) return saved;

    const response = await fetch(`${PUBLIC_CONFIG_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo localizar la API compartida de ToolHub.");
    const config = await response.json();
    const apiBase = cleanApiBase(config?.apiBase || "");
    if (!apiBase) throw new Error("La API compartida todavía no está configurada.");
    return apiBase;
  }

  function assetFromForm() {
    const name = document.querySelector("#assetName")?.value.trim() || "";
    const category = document.querySelector("#assetCategory")?.value || "";
    const author = document.querySelector("#assetAuthor")?.value.trim() || "";
    const platform = document.querySelector("#assetPlatform")?.value || "No especificado";
    const authorUrl = safeUrl(document.querySelector("#assetAuthorUrl")?.value || "");
    const previewRaw = document.querySelector("#assetPreview")?.value.trim() || "";
    const preview = previewRaw ? safeUrl(previewRaw) : "";
    const downloadUrl = safeUrl(document.querySelector("#assetDownloadUrl")?.value || "");
    const tags = normalizeTags(document.querySelector("#assetTags")?.value || "");
    const description = document.querySelector("#assetDescription")?.value.trim() || "";

    if (!name) throw new Error("Introduce un nombre para el asset.");
    if (!category) throw new Error("Selecciona una categoría.");
    if (!authorUrl) throw new Error("Introduce un enlace de autor/origen válido.");
    if (previewRaw && !preview) throw new Error("El enlace de Preview / Imagen no es válido.");
    if (!downloadUrl) throw new Error("Introduce un enlace de descarga válido.");

    return { name, category, author, platform, authorUrl, preview, downloadUrl, tags, description };
  }

  async function publicPublish(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    let originalText = publishButton.textContent;
    try {
      const asset = assetFromForm();
      const apiBase = await getApiBase();
      publishButton.disabled = true;
      publishButton.textContent = "Publicando…";

      const response = await fetch(`${apiBase}/assets`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(asset)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);

      form.reset();
      if (syncStatus) {
        syncStatus.textContent = "☁️ Asset publicado · visible para todos";
        syncStatus.className = "asset-sync-status ok";
      }

      // El script principal volverá a leer el catálogo al recuperar el foco;
      // recargamos para mostrar la nueva ficha inmediatamente.
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      alert(`No se pudo publicar: ${error.message}`);
    } finally {
      publishButton.disabled = false;
      publishButton.textContent = originalText;
    }
  }

  // Captura antes del listener original, que anteriormente exigía administrador.
  form.addEventListener("submit", publicPublish, true);
})();
