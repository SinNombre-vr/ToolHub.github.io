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
      // El catÃ¡logo estÃ¡tico seguirÃ¡ funcionando aunque la configuraciÃ³n pÃºblica no exista aÃºn.
    }
  }

  async function loadSharedAssets({ silent = false } = {}) {
    if (state.refreshing) return;
    state.refreshing = true;

    if (!silent) setSyncStatus("â˜ï¸ Cargando catÃ¡logo compartidoâ€¦");

    try {
      const api = state.apiBase;
      const url = api
        ? `${api}/assets?t=${Date.now()}`
        : `${CATALOG_URL}?t=${Date.now()}`;

      const payload = await fetchJson(url, { cache: "no-store" });
      const assets = Array.isArray(payload) ? payload : payload?.assets;

      if (!Array.isArray(assets)) {
        throw new Error("El catÃ¡logo no tiene un formato vÃ¡lido.");
      }

      state.assets = assets;
      state.catalogMode = "shared";
      render();
      setSyncStatus(
        `â˜ï¸ Compartido Â· ${assets.length} ${assets.length === 1 ? "asset" : "assets"} Â· actualizado ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
        "ok"
      );
    } catch (error) {
      console.error("No se pudo cargar el catÃ¡logo compartido:", error);
      const local = legacyAssets();

      if (local.length) {
        state.assets = local;
        state.catalogMode = "legacy";
        render();
        setSyncStatus(`âš ï¸ GitHub no disponible Â· mostrando ${local.length} asset(s) locales`, "warn");
      } else {
        state.assets = [];
        state.catalogMode = "error";
        render();
        setSyncStatus("âš ï¸ No se pudo cargar el catÃ¡logo compartido", "error");
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

       ²È="25±Õ”€ô€ˆˆì(€€€•±Ì¹…Á¥	…Í”¹Ù…±Õ”€ôÍÑ…Ñ”¹…Á¥	…Í”ñð±½…±MÑ½É…”¹•Ñ%Ñ•´¡A%}MQ=I}-d¤ñð€ˆˆì(€€€Í•Ñ‘µ¥¹5•ÍÍ…”¡µ•ÍÍ…”¤ì(€€€•±Ì¹…‘µ¥¹¥…±½œ¹Í¡½Ý5½‘…° ¤ì(€€€É•¹‘•É‘µ¥¹MÑ…Ñ” ¤ì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸Ù•É¥™å‘µ¥¸ ¤ì(€€€½¹ÍÐ…Á¥	…Í”€ô±•…¹Á¥	…Í”¡•±Ì¹…Á¥	…Í”¹Ù…±Õ”¤ì(€€€½¹ÍÐÁ…ÍÍÝ½É€ô•±Ì¹…‘µ¥¹A…ÍÍÝ½É¹Ù…±Õ”ì((€€€¥˜€ ……Á¥	…Í”¤ì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰%¹ÑÉ½‘Õ”ÁÉ¥µ•É¼±„UI0‘•°±½Õ‘™±…É”]½É­•È¸ˆ°€‰•ÉÉ½Èˆ¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€¥˜€ …Á…ÍÍÝ½É¤ì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰%¹ÑÉ½‘Õ”±„½¹ÑÉ…Í—Å„‘”…‘µ¥¹¥ÍÑÉ…‘½È¸ˆ°€‰•ÉÉ½Èˆ¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€•±Ì¹…‘µ¥¹U¹±½¬¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰½µÁÉ½‰…¹‘¼½¹•á§Í»Š˜ˆ¤ì((€€€ÑÉäì(€€€€€…Ý…¥Ð™•Ñ¡)Í½¸¡€‘í…Á¥	…Í•ô½…‘µ¥¸½Ù•É¥™å€°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€ÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘íÁ…ÍÍÝ½É‘õ€(€€€€€€€ô(€€€€€ô¤ì((€€€€€ÍÑ…Ñ”¹…Á¥	…Í”€ô…Á¥	…Í”ì(€€€€€ÍÑ…Ñ”¹…‘µ¥¹A…ÍÍÝ½É€ôÁ…ÍÍÝ½Éì(€€€€€ÍÑ…Ñ”¹…‘µ¥¹U¹±½­•€ôÑÉÕ”ì(€€€€€±½…±MÑ½É…”¹Í•Ñ%Ñ•´¡A%}MQ=I}-d°…Á¥	…Í”¤ì(€€€€€•±Ì¹…‘µ¥¹A…ÍÍÝ½É¹Ù…±Õ”€ô€ˆˆì((€€€€€€¼¼AÕ‰±¥„±„UI0‘•°]½É­•È½µ¼½¹™¥ÕÉ…§Í¸9<Í•É•Ñ„¸Ï´±½ÌÙ¥Í¥Ñ…¹Ñ•Ì(€€€€€€¼¼Á½‘Ë…¸±••È•°…Ó…±½¼‘¥É•Ñ…µ•¹Ñ”‘•Í‘”•°]½É­•ÈÕ…¹‘¼¥Ñ!ÕˆA…•Ì…ÑÕ…±¥”¸(€€€€€™•Ñ¡)Í½¸¡€‘í…Á¥	…Í•ô½…‘µ¥¸½ÁÕ‰±¥Í µ½¹™¥€°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèìÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘íÁ…ÍÍÝ½É‘õ€ô(€€€€€ô¤¹…Ñ  ¡•ÉÉ½È¤€ôø½¹Í½±”¹Ý…É¸ ‰9¼Í”ÁÕ‘¼ÁÕ‰±¥…È…ÍÍ•ÑÌµ½¹™¥œ¹©Í½¸èˆ°•ÉÉ½È¤¤ì((€€€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰‘µ¥¹¥ÍÑÉ…‘½È½¹•Ñ…‘¼¸e„ÁÕ•‘•Ì‰½ÉÉ…ÈÁÕ‰±¥…¥½¹•Ì½¸±„`¸ˆ°€‰½¬ˆ¤ì(€€€€€É•¹‘•È ¤ì(€€€€€…Ý…¥Ð±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€ÍÑ…Ñ”¹…‘µ¥¹U¹±½­•€ô™…±Í”ì(€€€€€ÍÑ…Ñ”¹…‘µ¥¹A…ÍÍÝ½É€ô€ˆˆì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…”¡9¼Í”ÁÕ‘¼‘•Í‰±½ÅÕ•…Èè€‘í•ÉÉ½È¹µ•ÍÍ…•õ€°€‰•ÉÉ½Èˆ¤ì(€€€€€É•¹‘•È ¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô™¥¹…±±äì(€€€€€•±Ì¹…‘µ¥¹U¹±½¬¹‘¥Í…‰±•€ô™…±Í”ì(€€€ô(€ô((€™Õ¹Ñ¥½¸…ÍÍ•ÑÉ½µ½É´ ¤ì(€€€½¹ÍÐ…ÕÑ¡½ÉUÉ°€ôÍ…™•UÉ°  ˆ…ÍÍ•ÑÕÑ¡½ÉUÉ°ˆ¤¹Ù…±Õ”¤ì(€€€½¹ÍÐ‘½Ý¹±½…‘UÉ°€ôÍ…™•UÉ°  ˆ…ÍÍ•Ñ½Ý¹±½…‘UÉ°ˆ¤¹Ù…±Õ”¤ì(€€€½¹ÍÐÁÉ•Ù¥•ÝY…±Õ”€ô€ ˆ…ÍÍ•ÑAÉ•Ù¥•Üˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€½¹ÍÐÁÉ•Ù¥•Ü€ôÁÉ•Ù¥•ÝY…±Õ”€üÍ…™•UÉ°¡ÁÉ•Ù¥•ÝY…±Õ”¤€è€ˆˆì((€€€¥˜€ ……ÕÑ¡½ÉUÉ°¤Ñ¡É½Ü¹•ÜÉÉ½È ‰%¹ÑÉ½‘Õ”Õ¸•¹±…”‘”…ÕÑ½È½½É¥•¸¡ÑÑÀ½¡ÑÑÁÌÛ…±¥‘¼¸ˆ¤ì(€€€¥˜€ …‘½Ý¹±½…‘UÉ°¤Ñ¡É½Ü¹•ÜÉÉ½È ‰%¹ÑÉ½‘Õ”Õ¸•¹±…”‘”‘•Í…É„¡ÑÑÀ½¡ÑÑÁÌÛ…±¥‘¼¸ˆ¤ì(€€€¥˜€¡ÁÉ•Ù¥•ÝY…±Õ”€˜˜€…ÁÉ•Ù¥•Ü¤Ñ¡É½Ü¹•ÜÉÉ½È ‰°•¹±…”‘”AÉ•Ù¥•Ü€¼%µ…•¸¹¼•ÌÛ…±¥‘¼¸ˆ¤ì((€€€É•ÑÕÉ¸ì(€€€€€¹…µ”è€ ˆ…ÍÍ•Ñ9…µ”ˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤°(€€€€€…Ñ•½Éäè€ ˆ…ÍÍ•Ñ…Ñ•½Éäˆ¤¹Ù…±Õ”°(€€€€€…ÕÑ¡½Èè€ ˆ…ÍÍ•ÑÕÑ¡½Èˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤°(€€€€€Á±…Ñ™½É´è€ ˆ…ÍÍ•ÑA±…Ñ™½É´ˆ¤¹Ù…±Õ”°(€€€€€…ÕÑ¡½ÉUÉ°°(€€€€€ÁÉ•Ù¥•Ü°(€€€€€‘½Ý¹±½…‘UÉ°°(€€€€€Ñ…Ìè¹½Éµ…±¥é•Q…Ì  ˆ…ÍÍ•ÑQ…Ìˆ¤¹Ù…±Õ”¤°(€€€€€‘•ÍÉ¥ÁÑ¥½¸è€ ˆ…ÍÍ•Ñ•ÍÉ¥ÁÑ¥½¸ˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤(€€€ôì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸ÁÕ‰±¥Í¡ÍÍ•Ð¡…ÍÍ•Ð¤ì(€€€¥˜€ …ÍÑ…Ñ”¹…Á¥	…Í”¤ì(€€€€€…±•ÉÐ ‰1„	¥‰±¥½Ñ•„Ñ½‘…Ûµ„¹¼Ñ¥•¹”½¹•Ñ…‘„±„A$½µÁ…ÉÑ¥‘„¸I•…É„±„Ã…¥¹„”¥¹Ó¥¹Ñ…±¼‘”¹Õ•Ù¼¸ˆ¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€•±Ì¹ÁÕ‰±¥Í¡	ÕÑÑ½¸¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€½¹ÍÐ½É¥¥¹…±Q•áÐ€ô•±Ì¹ÁÕ‰±¥Í¡	ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ðì(€€€•±Ì¹ÁÕ‰±¥Í¡	ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰AÕ‰±¥…¹‘¼•¸¥Ñ!Õ‹Š˜ˆì((€€€ÑÉäì(€€€€€½¹ÍÐÁ…å±½…€ô…Ý…¥Ð™•Ñ¡)Í½¸¡€‘íÍÑ…Ñ”¹…Á¥	…Í•ô½…ÍÍ•ÑÍ€°ì(€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆ(€€€€€€€ô°(€€€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡…ÍÍ•Ð¤(€€€€€ô¤ì((€€€€€½¹ÍÐÉ•…Ñ•€ôÁ…å±½…ü¹…ÍÍ•Ðì(€€€€€¥˜€¡É•…Ñ•¤ÍÑ…Ñ”¹…ÍÍ•ÑÌ¹Õ¹Í¡¥™Ð¡É•…Ñ•¤ì(€€€€€É•¹‘•È ¤ì(€€€€€•±Ì¹™½É´¹É•Í•Ð ¤ì(€€€€€Í•ÑMå¹MÑ…ÑÕÌ ‹Šb¾â<ÍÍ•ÐÁÕ‰±¥…‘¼•¸¥Ñ!Õˆƒ
ÜÙ¥Í¥‰±”Á…É„Ñ½‘½ÌÑÉ…Ì…ÑÕ…±¥é…ÈA…•Ìˆ°€‰½¬ˆ¤ì(€€€€€Í•ÑQ¥µ•½ÕÐ  ¤€ôø±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤°€ÄÈÀÀ¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€…±•ÉÐ¡9¼Í”ÁÕ‘¼ÁÕ‰±¥…Èè€‘í•ÉÉ½È¹µ•ÍÍ…•õ€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô™¥¹…±±äì(€€€€€•±Ì¹ÁÕ‰±¥Í¡	ÕÑÑ½¸¹‘¥Í…‰±•€ô™…±Í”ì(€€€€€•±Ì¹ÁÕ‰±¥Í¡	ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ô½É¥¥¹…±Q•áÐì(€€€ô(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸µ¥É…Ñ•1•…åÍÍ•ÑÌ ¤ì(€€€½¹ÍÐ±•…ä€ô±•…åÍÍ•ÑÌ ¤ì(€€€¥˜€ …±•…ä¹±•¹Ñ ¤É•ÑÕÉ¸ì((€€€¥˜€ …ÍÑ…Ñ”¹…Á¥	…Í”¤ì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰1„A$½µÁ…ÉÑ¥‘„Ñ½‘…Ûµ„¹¼•ÍÓ„‘¥ÍÁ½¹¥‰±”¸ˆ°€‰•ÉÉ½Èˆ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€½¹ÍÐ½¹™¥Éµ•€ô½¹™¥É´¡ƒ
ýAÕ‰±¥…È€‘í±•…ä¹±•¹Ñ¡ô…ÍÍ•Ð¡Ì¤±½…±•Ì•¸•°…Ó…±½¼½µÁ…ÉÑ¥‘¼‘”¥Ñ!Õˆý€¤ì(€€€¥˜€ …½¹™¥Éµ•¤É•ÑÕÉ¸ì((€€€•±Ì¹µ¥É…Ñ•1•…ä¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€±•Ð½µÁ±•Ñ•€ô€Àì((€€€ÑÉäì(€€€€€™½È€¡½¹ÍÐ…ÍÍ•Ð½˜±•…ä¤ì(€€€€€€€½¹ÍÐ±•…¸€ôì(€€€€€€€€€¹…µ”èMÑÉ¥¹œ¡…ÍÍ•Ð¹¹…µ”ñð€ˆˆ¤¹ÑÉ¥´ ¤°(€€€€€€€€€…Ñ•½ÉäèMÑÉ¥¹œ¡…ÍÍ•Ð¹…Ñ•½Éäñð€‰=ÑÉ¼ˆ¤°(€€€€€€€€€…ÕÑ¡½ÈèMÑÉ¥¹œ¡…ÍÍ•Ð¹…ÕÑ¡½Èñð€ˆˆ¤¹ÑÉ¥´ ¤°(€€€€€€€€€Á±…Ñ™½É´èMÑÉ¥¹œ¡…ÍÍ•Ð¹Á±…Ñ™½É´ñð€‰9¼•ÍÁ•¥™¥…‘¼ˆ¤°(€€€€€€€€€…ÕÑ¡½ÉUÉ°èÍ…™•UÉ°¡…ÍÍ•Ð¹…ÕÑ¡½ÉUÉ°ñð…ÍÍ•Ð¹ÕÉ°ñð€ˆˆ¤°(€€€€€€€€€ÁÉ•Ù¥•ÜèÍ…™•UÉ°¡…ÍÍ•Ð¹ÁÉ•Ù¥•Üñð€ˆˆ¤°(€€€€€€€€€‘½Ý¹±½…‘UÉ°èÍ…™•UÉ°¡…ÍÍ•Ð¹‘½Ý¹±½…‘UÉ°ñð…ÍÍ•Ð¹ÕÉ°ñð€ˆˆ¤°(€€€€€€€€€Ñ…ÌèÉÉ…ä¹¥ÍÉÉ…ä¡…ÍÍ•Ð¹Ñ…Ì¤€ü…ÍÍ•Ð¹Ñ…Ì¹Í±¥” À°€ÈÀ¤€èmt°(€€€€€€€€€‘•ÍÉ¥ÁÑ¥½¸èMÑÉ¥¹œ¡…ÍÍ•Ð¹‘•ÍÉ¥ÁÑ¥½¸ñð€ˆˆ¤¹Í±¥” À°€ÔÀÀ¤(€€€€€€€ôì((€€€€€€€¥˜€ …±•…¸¹¹…µ”ñð€…±•…¸¹…ÕÑ¡½ÉUÉ°ñð€…±•…¸¹‘½Ý¹±½…‘UÉ°¤½¹Ñ¥¹Õ”ì((€€€€€€€…Ý…¥Ð™•Ñ¡)Í½¸¡€‘íÍÑ…Ñ”¹…Á¥	…Í•ô½…ÍÍ•ÑÍ€°ì(€€€€€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€€€€€¡•…‘•ÉÌèì(€€€€€€€€€€€€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆ(€€€€€€€€€ô°(€€€€€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡±•…¸¤(€€€€€€€ô¤ì(€€€€€€€½µÁ±•Ñ•€¬ô€Äì(€€€€€€€Í•Ñ‘µ¥¹5•ÍÍ…”¡5¥É…¹‘¿Š˜€‘í½µÁ±•Ñ•‘ô¼‘í±•…ä¹±•¹Ñ¡õ€¤ì(€€€€€ô((€€€€€±½…±MÑ½É…”¹É•µ½Ù•%Ñ•´¡1e}MQ=I}-d¤ì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…”¡€‘í½µÁ±•Ñ•‘ôÁÕ‰±¥…§Í¸¡•Ì¤µ¥É…‘…Ì„¥Ñ!Õˆ¹€°€‰½¬ˆ¤ì(€€€€€É•¹‘•É‘µ¥¹MÑ…Ñ” ¤ì(€€€€€…Ý…¥Ð±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€Í•Ñ‘µ¥¹5•ÍÍ…”¡5¥É…§Í¸¥¹Ñ•ÉÉÕµÁ¥‘„è€‘í•ÉÉ½È¹µ•ÍÍ…•õ€°€‰•ÉÉ½Èˆ¤ì(€€€ô™¥¹…±±äì(€€€€€•±Ì¹µ¥É…Ñ•1•…ä¹‘¥Í…‰±•€ô™…±Í”ì(€€€ô(€ô((€•±Ì¹¹…Ù	ÕÑÑ½¹Ì¹™½É… ¡‰ÕÑÑ½¸€ôøì(€€€‰ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøÍ•ÑÑ¥Ù•A…¹•°¡‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹Á…¹•°¤¤ì(€ô¤ì((€•±Ì¹™½É´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰ÍÕ‰µ¥Ðˆ°…Íå¹Œ•Ù•¹Ð€ôøì(€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€ÑÉäì(€€€€€½¹ÍÐ…ÍÍ•Ð€ô…ÍÍ•ÑÉ½µ½É´ ¤ì(€€€€€…Ý…¥ÐÁÕ‰±¥Í¡ÍÍ•Ð¡…ÍÍ•Ð¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€…±•ÉÐ¡•ÉÉ½È¹µ•ÍÍ…”¤ì(€€€ô(€ô¤ì((€•±Ì¹Í•…É ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕÐˆ°€ ¤€ôøì(€€€ÍÑ…Ñ”¹Í•…É €ô•±Ì¹Í•…É ¹Ù…±Õ”ì(€€€É•¹‘•È ¤ì(€ô¤ì((€•±Ì¹™¥±Ñ•É…Ñ•½Éä¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€ÍÑ…Ñ”¹…Ñ•½Éä€ô•±Ì¹™¥±Ñ•É…Ñ•½Éä¹Ù…±Õ”ì(€€€É•¹‘•È ¤ì(€ô¤ì((€•±Ì¹™¥±Ñ•ÉA±…Ñ™½É´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€ÍÑ…Ñ”¹Á±…Ñ™½É´€ô•±Ì¹™¥±Ñ•ÉA±…Ñ™½É´¹Ù…±Õ”ì(€€€É•¹‘•È ¤ì(€ô¤ì((€•±Ì¹±•…É¥±Ñ•ÉÌ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€ÍÑ…Ñ”¹…Ñ•½Éä€ô€ˆˆì(€€€ÍÑ…Ñ”¹Á±…Ñ™½É´€ô€ˆˆì(€€€ÍÑ…Ñ”¹Ñ…Ì¹±•…È ¤ì(€€€•±Ì¹™¥±Ñ•É…Ñ•½Éä¹Ù…±Õ”€ô€ˆˆì(€€€•±Ì¹™¥±Ñ•ÉA±…Ñ™½É´¹Ù…±Õ”€ô€ˆˆì(€€€É•¹‘•È ¤ì(€ô¤ì((€•±Ì¹…‘µ¥¹QÉ¥•È¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø½Á•¹‘µ¥¸ ¤¤ì(€•±Ì¹…‘µ¥¹U¹±½¬¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€…Ý…¥ÐÙ•É¥™å‘µ¥¸ ¤ì(€ô¤ì((€•±Ì¹…‘µ¥¹1½¬¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€ÍÑ…Ñ”¹…‘µ¥¹U¹±½­•€ô™…±Í”ì(€€€ÍÑ…Ñ”¹…‘µ¥¹A…ÍÍÝ½É€ô€ˆˆì(€€€Í•Ñ‘µ¥¹5•ÍÍ…” ‰5½‘¼…‘µ¥¹¥ÍÑÉ…‘½È‰±½ÅÕ•…‘¼¸1„ÁÕ‰±¥…§Í¸Í¥Õ”Í¥•¹‘¼Ãé‰±¥„¸ˆ¤ì(€€€É•¹‘•È ¤ì(€ô¤ì((€•±Ì¹µ¥É…Ñ•1•…ä¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°µ¥É…Ñ•1•…åÍÍ•ÑÌ¤ì((€‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰Ù¥Í¥‰¥±¥Ñå¡…¹”ˆ°€ ¤€ôøì(€€€¥˜€ …‘½Õµ•¹Ð¹¡¥‘‘•¸¤±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤ì(€ô¤ì((€Ý¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰™½ÕÌˆ°€ ¤€ôø±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤¤ì((€É•¹‘•È ¤ì(€‘¥Í½Ù•ÉAÕ‰±¥Á¤ ¤¹™¥¹…±±ä  ¤€ôø±½…‘M¡…É•‘ÍÍ•ÑÌ ¤¤ì(€Í•Ñ%¹Ñ•ÉÙ…°  ¤€ôø±½…‘M¡…É•‘ÍÍ•ÑÌ¡ìÍ¥±•¹ÐèÑÉÕ”ô¤°IIM!}5L¤ì)ô¤ ¤ì