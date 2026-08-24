(() => {
  "use strict";

  const CATALOG_URL = "data/assets.json";
  const ISSUE_URL = "https://github.com/SinNombre-vr/ToolHub.github.io/issues/new";
  const START_MARKER = "<!-- TOOLHUB_ASSET_START -->";
  const END_MARKER = "<!-- TOOLHUB_ASSET_END -->";

  const state = {
    assets: [],
    search: "",
    category: "",
    platform: "",
    tags: new Set()
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
    syncStatus: $("#catalogSyncStatus")
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
        els.emptyText.textContent = "Usa Crear para preparar la primera ficha. GitHub la añadirá automáticamente al confirmar la solicitud.";
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
      els.syncStatus.textContent = `⚡ GitHub Actions · ${payload.length} ${payload.length === 1 ? "asset" : "assets"}`;
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
      name,
      category,
      author,
      platform,
      authorUrl,
      preview,
      downloadUrl,
      tags,
      description
    };
  }

  function createPublishIssueUrl(asset) {
    const title = `[ToolHub Asset] ${asset.name}`;
    const body = [
      "## Publicación automática desde ToolHub",
      "",
      "Esta solicitud fue generada por la Biblioteca de Assets. Al confirmar la Issue, GitHub Actions validará la ficha y la añadirá automáticamente a `data/assets.json`.",
      "",
      START_MARKER,
      "```json",
      JSON.stringify(asset, null, 2),
      "```",
      END_MARKER,
      "",
      "> No elimines los marcadores ni el bloque JSON."
    ].join("\n");

    return `${ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }

  function publishAsset(asset) {
    const url = createPublishIssueUrl(asset);
    const opened = window.open(url, "_blank");

    if (!opened) {
      window.location.href = url;
      return;
    }

    els.syncStatus.textContent = "🟢 GitHub abierto · confirma 'Submit new issue' para publicar";
    els.syncStatus.className = "asset-sync-status ok";
  }

  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => setActivePanel(button.dataset.panel));
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      publishAsset(assetFromForm());
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

  window.addEventListener("focus", () => {
    setTimeout(loadCatalog, 600);
  });

  render();
  loadCatalog();
})();