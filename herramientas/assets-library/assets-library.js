(() => {
  "use strict";

  const CATALOG_URL = "data/assets.json";

  const state = {
    assets: [],
    search: "",
    category: "",
    platform: "",
    tags: new Set(),
    generatedCatalog: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    navButtons: $$(".asset-nav-btn"),
    panels: $$(".asset-panel"),
    form: $("#assetForm"),
    grid: $("#assetGrid"),
    empty: $("#assetEmpty"),
    emptyTitle: $("#assetEmptyTitle"),
    emptyText: $("#assetEmptyText"),
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
    generatedWrap: $("#generatedCatalogWrap"),
    generatedJson: $("#generatedCatalogJson"),
    copyGenerated: $("#copyGeneratedCatalog"),
    downloadGenerated: $("#downloadGeneratedCatalog")
  };

  function safeUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeTags(input) {
    return [...new Set(
      String(input || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )].slice(0, 20);
  }

  function setActivePanel(name) {
    els.navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.panel === name);
    });

    els.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panelName === name);
    });
  }

  function allTags() {
    return [...new Set(state.assets.flatMap((asset) => Array.isArray(asset.tags) ? asset.tags : []))].sort();
  }

  function allCategories() {
    return [...new Set(state.assets.map((asset) => asset.category).filter(Boolean))].sort();
  }

  function filteredAssets() {
    const query = state.search.trim().toLowerCase();

    return state.assets.filter((asset) => {
      const haystack = [
        asset.name,
        asset.author,
        asset.description,
        asset.category,
        asset.platform,
        ...(Array.isArray(asset.tags) ? asset.tags : [])
      ].join(" ").toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (state.category && asset.category !== state.category) return false;
      if (state.platform && asset.platform !== state.platform) return false;

      if (state.tags.size) {
        const assetTags = new Set(Array.isArray(asset.tags) ? asset.tags : []);
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

  function renderFilterControls() {
    const categories = allCategories();
    const tags = allTags();
    const selectedCategory = state.category;

    els.filterCategory.innerHTML = '<option value="">Todas</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.filterCategory.appendChild(option);
    });
    els.filterCategory.value = selectedCategory;

    const buildTagButtons = (container, filtering) => {
      container.replaceChildren();
      tags.forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "asset-tag-button";
        button.textContent = `#${tag}`;
        if (filtering && state.tags.has(tag)) button.classList.add("active");

        button.addEventListener("click", () => {
          if (filtering) {
            state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
          } else {
            state.search = tag;
            els.search.value = tag;
            setActivePanel("search");
          }
          render();
        });

        container.appendChild(button);
      });
    };

    buildTagButtons(els.searchTags, false);
    buildTagButtons(els.filterTags, true);
  }

  function renderCards() {
    const assets = filteredAssets();
    els.grid.replaceChildren();
    els.resultCount.textContent = `${assets.length} ${assets.length === 1 ? "resultado" : "resultados"}`;

    if (!assets.length) {
      els.empty.hidden = false;
      if (!state.assets.length) {
        els.emptyTitle.textContent = "El catálogo está vacío";
        els.emptyText.textContent = "Añade la primera ficha desde Crear y guarda el JSON generado en data/assets.json.";
      } else {
        els.emptyTitle.textContent = "No hay coincidencias";
        els.emptyText.textContent = "Prueba otra búsqueda o restablece los filtros.";
      }
      return;
    }

    els.empty.hidden = true;

    assets.forEach((asset) => {
      const node = els.template.content.cloneNode(true);
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

      title.textContent = asset.name || "Sin nombre";
      category.textContent = asset.category || "OTRO";
      platform.textContent = asset.platform || "No especificado";
      author.textContent = asset.author ? `por ${asset.author}` : "Autor no especificado";
      description.textContent = asset.description || "Sin descripción.";

      const date = new Date(asset.createdAt || "");
      created.textContent = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES");

      const authorUrl = safeUrl(asset.authorUrl || asset.url || "");
      const downloadUrl = safeUrl(asset.downloadUrl || asset.url || "");
      authorLink.href = authorUrl || "#";
      downloadLink.href = downloadUrl || "#";
      authorLink.hidden = !authorUrl;
      downloadLink.hidden = !downloadUrl;

      const preview = safeUrl(asset.preview || "");
      fallback.hidden = false;
      if (preview) {
        image.src = preview;
        image.alt = `Preview de ${asset.name || "asset"}`;
        image.addEventListener("load", () => {
          image.classList.add("visible");
          fallback.hidden = true;
        }, { once: true });
        image.addEventListener("error", () => {
          image.classList.remove("visible");
          fallback.hidden = false;
        }, { once: true });
      }

      (Array.isArray(asset.tags) ? asset.tags : []).forEach((tag) => {
        const chip = document.createElement("span");
        chip.textContent = `#${tag}`;
        tagBox.appendChild(chip);
      });

      els.grid.appendChild(node);
    });
  }

  function render() {
    renderStats();
    renderFilterControls();
    renderCards();
  }

  async function loadCatalog() {
    els.syncStatus.textContent = "📄 Cargando data/assets.json…";
    els.syncStatus.className = "asset-sync-status";

    try {
      const response = await fetch(`${CATALOG_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("El catálogo debe ser un array JSON.");

      state.assets = payload;
      render();
      els.syncStatus.textContent = `📄 GitHub JSON · ${payload.length} ${payload.length === 1 ? "asset" : "assets"}`;
      els.syncStatus.className = "asset-sync-status ok";
    } catch (error) {
      console.error("No se pudo cargar data/assets.json:", error);
      state.assets = [];
      render();
      els.syncStatus.textContent = "⚠️ No se pudo cargar data/assets.json";
      els.syncStatus.className = "asset-sync-status error";
    }
  }

  function assetFromForm() {
    const name = $("#assetName").value.trim();
    const category = $("#assetCategory").value;
    const author = $("#assetAuthor").value.trim();
    const platform = $("#assetPlatform").value;
    const authorUrl = safeUrl($("#assetAuthorUrl").value);
    const previewRaw = $("#assetPreview").value.trim();
    const preview = previewRaw ? safeUrl(previewRaw) : "";
    const downloadUrl = safeUrl($("#assetDownloadUrl").value);
    const tags = normalizeTags($("#assetTags").value);
    const description = $("#assetDescription").value.trim();

    if (!name) throw new Error("Introduce un nombre para el asset.");
    if (!category) throw new Error("Selecciona una categoría.");
    if (!authorUrl) throw new Error("Introduce un enlace de autor/origen válido.");
    if (previewRaw && !preview) throw new Error("El enlace de Preview / Imagen no es válido.");
    if (!downloadUrl) throw new Error("Introduce un enlace de descarga válido.");

    return {
      id: `asset-${Date.now().toString(36)}`,
      name,
      category,
      author,
      platform,
      authorUrl,
      preview,
      downloadUrl,
      tags,
      description,
      createdAt: new Date().toISOString()
    };
  }

  function generateCatalog(asset) {
    const catalog = [asset, ...state.assets];
    state.generatedCatalog = catalog;
    els.generatedJson.value = JSON.stringify(catalog, null, 2);
    els.generatedWrap.hidden = false;
    els.generatedWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function copyGeneratedCatalog() {
    if (!state.generatedCatalog) return;
    const text = JSON.stringify(state.generatedCatalog, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      const original = els.copyGenerated.textContent;
      els.copyGenerated.textContent = "Copiado ✓";
      setTimeout(() => { els.copyGenerated.textContent = original; }, 1400);
    } catch {
      els.generatedJson.focus();
      els.generatedJson.select();
      document.execCommand("copy");
    }
  }

  function downloadGeneratedCatalog() {
    if (!state.generatedCatalog) return;
    const blob = new Blob([JSON.stringify(state.generatedCatalog, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assets.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => setActivePanel(button.dataset.panel));
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      generateCatalog(assetFromForm());
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

  els.copyGenerated.addEventListener("click", copyGeneratedCatalog);
  els.downloadGenerated.addEventListener("click", downloadGeneratedCatalog);

  render();
  loadCatalog();
})();
