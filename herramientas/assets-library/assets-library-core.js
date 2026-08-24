(() => {
  "use strict";

  const LEGACY_STORAGE_KEY = "toolhub_asset_library_v1";
  const API_STORAGE_KEY = "toolhub_asset_api_base_v1";
  const CATALOG_URL = "data/assets.json";
  const PUBLIC_CONFIG_URL = "data/assets-config.json";
  const REFRESH_MS = 60000;

  const state = {
    assets: [],
    search: "",
    category: "",
    platform: "",
    tags: new Set(),
    adminUnlocked: false,
    adminPassword: "",
    apiBase: "",
    catalogMode: "shared",
    pendingCreate: null,
    refreshing: false
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    navButtons: $$(".asset-nav-btn"),
    panels: $$(".asset-panel"),
    form: $("#assetForm"),
    publishButton: $("#assetPublishButton"),
    grid: $("#assetGrid"),
    empty: $("#assetEmpty"),
    template: $("#assetCardTemplate"),
    search: $("#assetSearch"),
    searchTags: $("#searchTags"),
    filterCategory: $("#filterCategory"),
    filterPlatform: $("#filterPlatform"),
    filterTags: $("#filterTags"),
    clearFilters: $("#clearFilters"),
    resultCount: $("#resultCount"),
    assetCount: $("#assetCount"),
    tagCount: $("#tagCount"),
    categoryCount: $("#categoryCount"),
    syncStatus: $("#catalogSyncStatus"),
    adminDialog: $("#adminDialog"),
    adminTrigger: $("#adminTrigger"),
    adminPassword: $("#adminPassword"),
    adminUnlock: $("#adminUnlock"),
    adminLock: $("#adminLock"),
    adminStatus: $("#adminStatus"),
    adminMessage: $("#adminMessage"),
    apiBase: $("#assetApiBase"),
    legacyMigration: $("#legacyMigration"),
    legacyMigrationText: $("#legacyMigrationText"),
    migrateLegacy: $("#migrateLegacyAssets")
  };

  function normalizeTags(input) {
    return [...new Set(
      String(input || "")
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean)
    )].slice(0, 20);
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function cleanApiBase(value) {
    const url = safeUrl(value);
    return url ? url.replace(/\/+$/, "") : "";
  }

  function legacyAssets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setSyncStatus(text, mode = "") {
    els.syncStatus.textContent = text;
    els.syncStatus.className = "asset-sync-status" + (mode ? ` ${mode}` : "");
  }

  function setAdminMessage(text, mode = "") {
    els.adminMessage.textContent = text || "";
    els.adminMessage.className = "asset-admin-message" + (mode ? ` ${mode}` : "");
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.headers || {})
        }
      });

      let payload = null;
      const type = response.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        payload = await response.json().catch(() => null);
      }

      if (!response.ok) {
        const message = payload?.error || payload?.message || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function discoverPublicApi() {
    const local = cleanApiBase(localStorage.getItem(API_STORAGE_KEY) || "");
    if (local) {
      state.apiBase = local;
      return;
    }

    try {
      const config = await fetchJson(`${PUBLIC_CONFIG_URL}?t=${Date.now()}`, { cache: "no-store" });
      const publicApi = cleanApiBase(config?.apiBase || "");
      if (publicApi) state.apiBase = publicApi;
    } catch (_) {
      // El catálogo estático seguirá funcionando aunque la configuración pública no exista aún.
    }
  }

  async function loadSharedAssets({ silent = false } = {}) {
    if (state.refreshing) return;
    state.refreshing = true;

    if (!silent) setSyncStatus("☁️ Cargando catálogo compartido…");

    try {
      const api = state.apiBase;
      const url = api
        ? `${api}/assets?t=${Date.now()}`
        : `${CATALOG_URL}?t=${Date.now()}`;

      const payload = await fetchJson(url, { cache: "no-store" });
      const assets = Array.isArray(payload) ? payload : payload?.assets;

      if (!Array.isArray(assets)) {
        throw new Error("El catálogo no tiene un formato válido.");
      }

      state.assets = assets;
      state.catalogMode = "shared";
      render();
      setSyncStatus(
        `☁️ Compartido · ${assets.length} ${assets.length === 1 ? "asset" : "assets"} · actualizado ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
        "ok"
      );
    } catch (error) {
      console.error("No se pudo cargar el catálogo compartido:", error);
      const local = legacyAssets();

      if (local.length) {
        state.assets = local;
        state.catalogMode = "legacy";
        render();
        setSyncStatus(`⚠️ GitHub no disponible · mostrando ${local.length} asset(s) locales`, "warn");
      } else {
        state.assets = [];
        state.catalogMode = "error";
        render();
        setSyncStatus("⚠️ No se pudo cargar el catálogo compartido", "error");
      }
    } finally {
      state.refreshing = false;
    }
  }

  function setActivePanel(name) {
    els.navButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.panel === name);
    });

    els.panels.forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panelName === name);
    });
  }

  function allTags() {
    return [...new Set(state.assets.flatMap(asset => asset.tags || []))].sort();
  }

  function allCategories() {
    return [...new Set(state.assets.map(asset => asset.category).filter(Boolean))].sort();
  }

  function updateFilters() {
    const currentCategory = state.category;
    els.filterCategory.innerHTML = '<option value="">Todas</option>';

    allCategories().forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.filterCategory.appendChild(option);
    });

    els.filterCategory.value = currentCategory;
    const tags = allTags();

    const buildTags = (container, interactiveFilter) => {
      container.replaceChildren();

      tags.forEach(tag => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "asset-tag-button";
        button.textContent = "#" + tag;

        if (interactiveFilter && state.tags.has(tag)) {
          button.classList.add("active");
        }

        button.addEventListener("click", () => {
          if (interactiveFilter) {
            state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
            render();
          } else {
            state.search = tag;
            els.search.value = tag;
            setActivePanel("search");
            render();
          }
        });

        container.appendChild(button);
      });
    };

    buildTags(els.searchTags, false);
    buildTags(els.filterTags, true);
  }

  function filteredAssets() {
    const q = state.search.trim().toLowerCase();

    return state.assets.filter(asset => {
      const haystack = [
        asset.name,
        asset.author,
        asset.description,
        asset.category,
        asset.platform,
        ...(asset.tags || [])
      ].join(" ").toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (state.category && asset.category !== state.category) return false;
      if (state.platform && asset.platform !== state.platform) return false;

      if (state.tags.size) {
        const assetTags = new Set(asset.tags || []);
        for (const tag of state.tags) {
          if (!assetTags.has(tag)) return false;
        }
      }

      return true;
    });
  }

  function renderStats() {
    els.assetCount.textContent = String(state.assets.length);
    els.tagCount.textContent = String(allTags().length);
    els.categoryCount.textContent = String(allCategories().length);
  }

  async function deleteSharedAsset(asset, card) {
    if (!state.adminUnlocked || !state.adminPassword || !state.apiBase) return;

    const confirmed = confirm(`¿Eliminar "${asset.name}" del catálogo compartido para todos?`);
    if (!confirmed) return;

    card.classList.add("is-deleting");

    try {
      await fetchJson(`${state.apiBase}/assets/${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${state.adminPassword}`
        }
      });

      state.assets = state.assets.filter(item => item.id !== asset.id);
      render();
      setSyncStatus("☁️ Publicación eliminada de GitHub · sincronizando…", "ok");
      setTimeout(() => loadSharedAssets({ silent: true }), 1200);
    } catch (error) {
      alert(`No se pudo eliminar: ${error.message}`);
      card.classList.remove("is-deleting");
    }
  }

  function renderCards() {
    const assets = filteredAssets();
    els.grid.replaceChildren();

    els.empty.hidden = state.assets.length !== 0;
    els.resultCount.textContent = `${assets.length} ${assets.length === 1 ? "resultado" : "resultados"}`;

    assets.forEach(asset => {
      const node = els.template.content.cloneNode(true);
      const card = node.querySelector(".asset-card");
      const image = node.querySelector(".asset-preview");
      const fallback = node.querySelector(".asset-preview-fallback");
      const platform = node.querySelector(".asset-platform-badge");
      const category = node.querySelector(".asset-category");
      const created = node.querySelector(".asset-created");
      const title = node.querySelector(".asset-title");
      const author = node.querySelector(".asset-author");
      const description = node.querySelector(".asset-description");
      const tagBox = node.querySelector(".asset-card-tags");
      const authorLink = node.querySelector(".asset-author-link");
      const downloadLink = node.querySelector(".asset-download-link");
      const del = node.querySelector(".asset-delete-x");

      title.textContent = asset.name || "Sin nombre";
      category.textContent = asset.category || "OTRO";
      platform.textContent = asset.platform || "No especificado";
      author.textContent = asset.author ? `por ${asset.author}` : "Autor no especificado";
      description.textContent = asset.description || "Sin descripción.";

      const date = new Date(asset.createdAt || Date.now());
      created.textContent = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES");

      const legacyUrl = safeUrl(asset.url || "");
      const authorUrl = safeUrl(asset.authorUrl || legacyUrl);
      const downloadUrl = safeUrl(asset.downloadUrl || legacyUrl);

      authorLink.href = authorUrl || "#";
      downloadLink.href = downloadUrl || "#";
      authorLink.hidden = !authorUrl;
      downloadLink.hidden = !downloadUrl;
      del.hidden = !state.adminUnlocked;

      const preview = safeUrl(asset.preview);
      fallback.hidden = false;

      if (preview) {
        image.src = preview;
        image.alt = `Preview de ${asset.name || "asset"}`;
        image.addEventListener("load", () => {
          image.classList.add("visible");
          fallback.hidden = true;
        });
        image.addEventListener("error", () => {
          image.classList.remove("visible");
          fallback.hidden = false;
        });
      }

      (asset.tags || []).forEach(tag => {
        const chip = document.createElement("span");
        chip.textContent = "#" + tag;
        tagBox.appendChild(chip);
      });

      del.addEventListener("click", () => deleteSharedAsset(asset, card));
      card.dataset.assetId = asset.id || "";
      els.grid.appendChild(node);
    });
  }

  function renderAdminState() {
    els.adminTrigger.classList.toggle("unlocked", state.adminUnlocked);
    els.adminTrigger.textContent = state.adminUnlocked ? "🔓 Administrador" : "🔒 Administrador";
    els.adminStatus.classList.toggle("unlocked", state.adminUnlocked);
    els.adminStatus.textContent = state.adminUnlocked
      ? "🔓 Conectado · publicación y borrado habilitados"
      : "🔒 Modo administrador bloqueado";
    els.form.classList.toggle("is-locked", !state.adminUnlocked);

    const legacy = legacyAssets();
    els.legacyMigration.hidden = legacy.length === 0;
    if (legacy.length) {
      els.legacyMigrationText.textContent = `Hay ${legacy.length} ${legacy.length === 1 ? "publicación local" : "publicaciones locales"} de la versión anterior. Puedes migrarlas al catálogo compartido.`;
    }
  }

  function render() {
    updateFilters();
    renderStats();
    renderCards();
    renderAdminState();
  }

  function openAdmin(message = "") {
    els.adminPassword.value = "";
    els.apiBase.value = state.apiBase || localStorage.getItem(API_STORAGE_KEY) || "";
    setAdminMessage(message);
    els.adminDialog.showModal();
    renderAdminState();
  }

  async function verifyAdmin() {
    const apiBase = cleanApiBase(els.apiBase.value);
    const password = els.adminPassword.value;

    if (!apiBase) {
      setAdminMessage("Introduce primero la URL del Cloudflare Worker.", "error");
      return false;
    }

    if (!password) {
      setAdminMessage("Introduce la contraseña de administrador.", "error");
      return false;
    }

    els.adminUnlock.disabled = true;
    setAdminMessage("Comprobando conexión…");

    try {
      await fetchJson(`${apiBase}/admin/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${password}`
        }
      });

      state.apiBase = apiBase;
      state.adminPassword = password;
      state.adminUnlocked = true;
      localStorage.setItem(API_STORAGE_KEY, apiBase);
      els.adminPassword.value = "";

      fetchJson(`${apiBase}/admin/publish-config`, {
        method: "POST",
        headers: { Authorization: `Bearer ${password}` }
      }).catch((error) => console.warn("No se pudo publicar assets-config.json:", error));

      setAdminMessage("Conectado correctamente. Los cambios se publicarán en GitHub.", "ok");
      render();
      await loadSharedAssets({ silent: true });
      return true;
    } catch (error) {
      state.adminUnlocked = false;
      state.adminPassword = "";
      setAdminMessage(`No se pudo desbloquear: ${error.message}`, "error");
      render();
      return false;
    } finally {
      els.adminUnlock.disabled = false;
    }
  }

  function assetFromForm() {
    const authorUrl = safeUrl($("#assetAuthorUrl").value);
    const downloadUrl = safeUrl($("#assetDownloadUrl").value);
    const previewValue = $("#assetPreview").value.trim();
    const preview = previewValue ? safeUrl(previewValue) : "";

    if (!authorUrl) throw new Error("Introduce un enlace de autor/origen http/https válido.");
    if (!downloadUrl) throw new Error("Introduce un enlace de descarga http/https válido.");
    if (previewValue && !preview) throw new Error("El enlace de Preview / Imagen no es válido.");

    return {
      name: $("#assetName").value.trim(),
      category: $("#assetCategory").value,
      author: $("#assetAuthor").value.trim(),
      platform: $("#assetPlatform").value,
      authorUrl,
      preview,
      downloadUrl,
      tags: normalizeTags($("#assetTags").value),
      description: $("#assetDescription").value.trim()
    };
  }

  async function publishAsset(asset) {
    if (!state.adminUnlocked || !state.apiBase || !state.adminPassword) {
      state.pendingCreate = asset;
      openAdmin("Desbloquea el modo administrador para publicar este asset para todos.");
      return false;
    }

    els.publishButton.disabled = true;
    const originalText = els.publishButton.textContent;
    els.publishButton.textContent = "Publicando en GitHub…";

    try {
      const payload = await fetchJson(`${state.apiBase}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.adminPassword}`
        },
        body: JSON.stringify(asset)
      });

      const created = payload?.asset;
      if (created) state.assets.unshift(created);
      render();
      els.form.reset();
      setSyncStatus("☁️ Asset publicado en GitHub · visible para todos tras actualizar Pages", "ok");
      setTimeout(() => loadSharedAssets({ silent: true }), 1200);
      return true;
    } catch (error) {
      alert(`No se pudo publicar: ${error.message}`);
      return false;
    } finally {
      els.publishButton.disabled = false;
      els.publishButton.textContent = originalText;
    }
  }

  async function migrateLegacyAssets() {
    const legacy = legacyAssets();
    if (!legacy.length) return;

    if (!state.adminUnlocked || !state.apiBase || !state.adminPassword) {
      setAdminMessage("Desbloquea primero el modo administrador para migrar.", "error");
      return;
    }

    const confirmed = confirm(`¿Publicar ${legacy.length} asset(s) locales en el catálogo compartido de GitHub?`);
    if (!confirmed) return;

    els.migrateLegacy.disabled = true;
    let completed = 0;

    try {
      for (const asset of legacy) {
        const clean = {
          name: String(asset.name || "").trim(),
          category: String(asset.category || "Otro"),
          author: String(asset.author || "").trim(),
          platform: String(asset.platform || "No especificado"),
          authorUrl: safeUrl(asset.authorUrl || asset.url || ""),
          preview: safeUrl(asset.preview || ""),
          downloadUrl: safeUrl(asset.downloadUrl || asset.url || ""),
          tags: Array.isArray(asset.tags) ? asset.tags.slice(0, 20) : [],
          description: String(asset.description || "").slice(0, 500)
        };

        if (!clean.name || !clean.authorUrl || !clean.downloadUrl) continue;

        await fetchJson(`${state.apiBase}/assets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.adminPassword}`
          },
          body: JSON.stringify(clean)
        });
        completed += 1;
        setAdminMessage(`Migrando… ${completed}/${legacy.length}`);
      }

      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setAdminMessage(`${completed} publicación(es) migradas a GitHub.`, "ok");
      renderAdminState();
      await loadSharedAssets({ silent: true });
    } catch (error) {
      setAdminMessage(`Migración interrumpida: ${error.message}`, "error");
    } finally {
      els.migrateLegacy.disabled = false;
    }
  }

  els.navButtons.forEach(button => {
    button.addEventListener("click", () => setActivePanel(button.dataset.panel));
  });

  els.form.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const asset = assetFromForm();
      await publishAsset(asset);
    } catch (error) {
      alert(error.message);
    }
  });

  els.search.addEventListener("input", () => {
    state.search = els.search.value;
    render();
  });

  els.filterCategory.addEventListener("change", () => {
    state.category = els.filterCategory.value;
    render();
  });

  els.filterPlatform.addEventListener("change", () => {
    state.platform = els.filterPlatform.value;
    render();
  });

  els.clearFilters.addEventListener("click", () => {
    state.category = "";
    state.platform = "";
    state.tags.clear();
    els.filterCategory.value = "";
    els.filterPlatform.value = "";
    render();
  });

  els.adminTrigger.addEventListener("click", () => openAdmin());
  els.adminUnlock.addEventListener("click", async () => {
    const ok = await verifyAdmin();
    if (ok && state.pendingCreate) {
      const pending = state.pendingCreate;
      state.pendingCreate = null;
      els.adminDialog.close();
      await publishAsset(pending);
    }
  });

  els.adminLock.addEventListener("click", () => {
    state.adminUnlocked = false;
    state.adminPassword = "";
    state.pendingCreate = null;
    setAdminMessage("Modo administrador bloqueado.");
    render();
  });

  els.migrateLegacy.addEventListener("click", migrateLegacyAssets);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadSharedAssets({ silent: true });
  });

  window.addEventListener("focus", () => loadSharedAssets({ silent: true }));

  render();
  discoverPublicApi().finally(() => loadSharedAssets());
  setInterval(() => loadSharedAssets({ silent: true }), REFRESH_MS);
})();