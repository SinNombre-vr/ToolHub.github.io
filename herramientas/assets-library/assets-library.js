(() => {
  "use strict";

  const BASE_FIELDS = "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at,submitted_by";
  const V2_FIELDS = `${BASE_FIELDS},is_hidden,is_featured,updated_at`;

  const state = {
    assets: [],
    search: "",
    category: "",
    platform: "",
    tags: new Set(),
    adminUnlocked: false,
    adminUser: null,
    adminRole: null,
    schemaV2: false,
    ready: false
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
    syncStatus: $("#catalogSyncStatus"),
    adminDialog: $("#adminDialog"),
    adminTrigger: $("#adminTrigger"),
    adminEmail: $("#adminEmail"),
    adminPassword: $("#adminPassword"),
    adminLogin: $("#adminLogin"),
    adminLogout: $("#adminLogout"),
    adminStatus: $("#adminStatus"),
    adminMessage: $("#adminMessage")
  };

  let db = null;
  let publishDb = null;

  function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function setSyncStatus(text, mode = "") {
    if (!els.syncStatus) return;
    els.syncStatus.textContent = text;
    els.syncStatus.className = "asset-sync-status" + (mode ? ` ${mode}` : "");
  }

  function setAdminMessage(text, mode = "") {
    if (!els.adminMessage) return;
    els.adminMessage.textContent = text || "";
    els.adminMessage.className = "asset-admin-message" + (mode ? ` ${mode}` : "");
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeTags(input) {
    const source = Array.isArray(input) ? input.join(",") : String(input || "");
    return [...new Set(
      source
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 32))
    )].slice(0, 20);
  }

  function isNsfw(asset) {
    return normalizeTags(asset?.tags).includes("nsfw");
  }

  function canDelete() {
    if (!state.adminUnlocked) return false;
    if (!state.schemaV2) return true;
    return ["owner", "admin"].includes(state.adminRole);
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
    return state.assets
      .filter((asset) => {
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
      })
      .sort((a, b) => {
        const featureDiff = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
        if (featureDiff) return featureDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }

  function renderStats() {
    if (els.assetCount) els.assetCount.textContent = String(state.assets.length);
    if (els.tagCount) els.tagCount.textContent = String(allTags().length);
    if (els.categoryCount) els.categoryCount.textContent = String(allCategories().length);
  }

  function renderFilterControls() {
    if (!els.filterCategory || !els.filterTags || !els.searchTags) return;
    const categories = allCategories();
    const tags = allTags();
    const currentCategory = state.category;

    els.filterCategory.innerHTML = '<option value="">Todas</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.filterCategory.appendChild(option);
    });
    els.filterCategory.value = currentCategory;

    const buildTags = (container, filtering) => {
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
            if (els.search) els.search.value = tag;
            setActivePanel("search");
          }
          render();
        });
        container.appendChild(button);
      });
    };

    buildTags(els.searchTags, false);
    buildTags(els.filterTags, true);
  }

  function renderAdminState() {
    if (!els.adminTrigger || !els.adminStatus) return;
    const roleLabel = state.adminRole ? ` · ${state.adminRole}` : "";
    els.adminTrigger.classList.toggle("unlocked", state.adminUnlocked);
    els.adminTrigger.textContent = state.adminUnlocked ? "🔓 Administrador" : "🔒 Administrador";
    els.adminStatus.classList.toggle("unlocked", state.adminUnlocked);
    els.adminStatus.textContent = state.adminUnlocked
      ? `🔓 Administrador activo${roleLabel}${state.adminUser?.email ? ` · ${state.adminUser.email}` : ""}`
      : "🔒 Administrador bloqueado · gestión protegida";
    if (els.adminLogout) els.adminLogout.hidden = !state.adminUnlocked;
    if (els.adminLogin) els.adminLogin.hidden = state.adminUnlocked;
  }

  async function deleteAsset(asset, card) {
    if (!db || !canDelete()) return;
    if (!confirm(`¿Eliminar definitivamente "${asset.name}" de la biblioteca?`)) return;

    card?.classList.add("is-deleting");
    const { error } = await db.from("assets").delete().eq("id", asset.id);

    if (error) {
      card?.classList.remove("is-deleting");
      alert(`No se pudo eliminar: ${error.message}`);
      return;
    }

    state.assets = state.assets.filter((item) => item.id !== asset.id);
    render();
    setSyncStatus("✅ Asset eliminado", "ok");
  }

  function renderCards() {
    if (!els.grid || !els.template) return;
    const assets = filteredAssets();
    els.grid.replaceChildren();
    if (els.resultCount) els.resultCount.textContent = `${assets.length} ${assets.length === 1 ? "resultado" : "resultados"}`;

    if (!assets.length) {
      if (els.empty) els.empty.hidden = false;
      if (!state.assets.length) {
        if (els.emptyTitle) els.emptyTitle.textContent = state.ready ? "La biblioteca está vacía" : "Supabase pendiente de configurar";
        if (els.emptyText) els.emptyText.textContent = state.ready
          ? "Usa Crear para publicar la primera ficha. Aparecerá para todos automáticamente."
          : "En cuanto conectemos el proyecto de Supabase, la biblioteca quedará lista.";
      } else {
        if (els.emptyTitle) els.emptyTitle.textContent = "No hay coincidencias";
        if (els.emptyText) els.emptyText.textContent = "Prueba otra búsqueda o restablece los filtros.";
      }
      emit("toolhub-assets-rendered", { assets: [] });
      return;
    }

    if (els.empty) els.empty.hidden = true;

    assets.forEach((asset) => {
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

      card.dataset.assetId = asset.id;
      card.classList.toggle("is-featured", Boolean(asset.is_featured));
      card.classList.toggle("is-hidden-admin", Boolean(asset.is_hidden));
      card.classList.toggle("is-nsfw", isNsfw(asset));

      title.textContent = asset.name || "Sin nombre";
      category.textContent = asset.category || "OTRO";
      platform.textContent = asset.platform || "No especificado";
      author.textContent = asset.author ? `por ${asset.author}` : "Autor no especificado";
      description.textContent = asset.description || "Sin descripción.";
      del.hidden = !canDelete();

      const date = new Date(asset.created_at || "");
      created.textContent = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES");

      const authorUrl = safeUrl(asset.author_url || "");
      const downloadUrl = safeUrl(asset.download_url || "");
      authorLink.href = authorUrl || "#";
      downloadLink.href = downloadUrl || "#";
      authorLink.hidden = !authorUrl;
      downloadLink.hidden = !downloadUrl;

      const preview = safeUrl(asset.preview_url || "");
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

      del.addEventListener("click", () => deleteAsset(asset, card));
      els.grid.appendChild(node);
    });

    emit("toolhub-assets-rendered", { assets });
  }

  function render() {
    renderStats();
    renderFilterControls();
    renderCards();
    renderAdminState();
  }

  async function loadAssets() {
    if (!db) return;
    setSyncStatus("☁️ Cargando biblioteca…");

    let result = await db
      .from("assets")
      .select(V2_FIELDS)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (result.error) {
      const fallback = await db
        .from("assets")
        .select(BASE_FIELDS)
        .order("created_at", { ascending: false })
        .limit(500);

      if (fallback.error) {
        console.error(fallback.error);
        setSyncStatus(`⚠️ ${fallback.error.message}`, "error");
        return;
      }

      state.schemaV2 = false;
      state.assets = (Array.isArray(fallback.data) ? fallback.data : []).map((asset) => ({
        ...asset,
        is_hidden: false,
        is_featured: false,
        updated_at: asset.created_at
      }));
    } else {
      state.schemaV2 = true;
      state.assets = Array.isArray(result.data) ? result.data : [];
    }

    state.ready = true;
    render();
    const suffix = state.schemaV2 ? "" : " · Admin v2 pendiente";
    setSyncStatus(`☁️ Supabase · ${state.assets.length} ${state.assets.length === 1 ? "asset" : "assets"}${suffix}`, state.schemaV2 ? "ok" : "warn");
  }

  function assetFromForm() {
    const name = $("#assetName")?.value.trim() || "";
    const category = $("#assetCategory")?.value || "";
    const author = $("#assetAuthor")?.value.trim() || "";
    const platform = $("#assetPlatform")?.value || "No especificado";
    const authorUrl = safeUrl($("#assetAuthorUrl")?.value || "");
    const previewRaw = $("#assetPreview")?.value.trim() || "";
    const preview = previewRaw ? safeUrl(previewRaw) : "";
    const downloadUrl = safeUrl($("#assetDownloadUrl")?.value || "");
    let tags = normalizeTags($("#assetTags")?.value || "");
    const description = $("#assetDescription")?.value.trim() || "";
    const nsfw = Boolean($("#assetNsfw")?.checked);

    tags = tags.filter((tag) => tag !== "nsfw");
    if (nsfw) tags.push("nsfw");

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
      author_url: authorUrl,
      preview_url: preview,
      download_url: downloadUrl,
      tags,
      description
    };
  }

  async function publishAsset() {
    if (!db || !state.ready) {
      alert("Supabase todavía no está configurado.");
      return;
    }

    let asset;
    try {
      asset = assetFromForm();
    } catch (error) {
      alert(error.message);
      return;
    }

    els.publishButton.disabled = true;
    const originalText = els.publishButton.textContent;
    els.publishButton.textContent = "Publicando…";

    const fields = state.schemaV2 ? V2_FIELDS : BASE_FIELDS;
    const publishingClient = publishDb || db;
    const { data, error } = await publishingClient
      .from("assets")
      .insert(asset)
      .select(fields)
      .single();

    els.publishButton.disabled = false;
    els.publishButton.textContent = originalText;

    if (error) {
      alert(`No se pudo publicar: ${error.message}`);
      return;
    }

    state.assets.unshift({ is_hidden: false, is_featured: false, ...data });
    els.form.reset();
    setActivePanel("create");
    render();
    setSyncStatus(data?.submitted_by ? "✅ Publicado · asociado a tu perfil" : "✅ Publicado · visible para todos", "ok");
  }

  async function checkAdmin(user) {
    if (!db || !user) return false;

    let result = await db
      .from("toolhub_admins")
      .select("user_id,role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (result.error) {
      result = await db
        .from("toolhub_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
    }

    if (result.error || !result.data) return false;
    state.adminUnlocked = true;
    state.adminUser = user;
    state.adminRole = result.data.role || "admin";
    render();
    emit("toolhub-admin-changed", { unlocked: true, role: state.adminRole, user });
    return true;
  }

  async function adminLogin() {
    if (!db) {
      setAdminMessage("Supabase todavía no está configurado.", "error");
      return;
    }

    const email = els.adminEmail.value.trim();
    const password = els.adminPassword.value;
    if (!email || !password) {
      setAdminMessage("Introduce email y contraseña.", "error");
      return;
    }

    els.adminLogin.disabled = true;
    setAdminMessage("Comprobando administrador…");

    const { data, error } = await db.auth.signInWithPassword({ email, password });
    els.adminLogin.disabled = false;

    if (error || !data.user) {
      setAdminMessage(error?.message || "No se pudo iniciar sesión.", "error");
      return;
    }

    const allowed = await checkAdmin(data.user);
    if (!allowed) {
      await db.auth.signOut();
      state.adminUnlocked = false;
      state.adminUser = null;
      state.adminRole = null;
      render();
      setAdminMessage("La cuenta es válida, pero no está autorizada como administrador.", "error");
      return;
    }

    els.adminPassword.value = "";
    await loadAssets();
    setAdminMessage("Panel de administración activado.", "ok");
  }

  async function adminLogout() {
    if (db) await db.auth.signOut();
    state.adminUnlocked = false;
    state.adminUser = null;
    state.adminRole = null;
    render();
    emit("toolhub-admin-changed", { unlocked: false, role: null, user: null });
    await loadAssets();
    setAdminMessage("Administrador bloqueado.");
  }

  function wireEvents() {
    els.navButtons.forEach((button) => {
      button.addEventListener("click", () => setActivePanel(button.dataset.panel));
    });

    els.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      publishAsset();
    });

    els.search?.addEventListener("input", () => {
      state.search = els.search.value;
      render();
    });

    els.filterCategory?.addEventListener("change", () => {
      state.category = els.filterCategory.value;
      render();
    });

    els.filterPlatform?.addEventListener("change", () => {
      state.platform = els.filterPlatform.value;
      render();
    });

    els.clearFilters?.addEventListener("click", () => {
      state.category = "";
      state.platform = "";
      state.tags.clear();
      els.filterCategory.value = "";
      els.filterPlatform.value = "";
      render();
    });

    els.adminTrigger?.addEventListener("click", () => {
      setAdminMessage("");
      els.adminDialog.showModal();
    });
    els.adminLogin?.addEventListener("click", adminLogin);
    els.adminLogout?.addEventListener("click", adminLogout);
  }

  async function init() {
    wireEvents();
    render();

    const config = window.TOOLHUB_SUPABASE || {};
    if (!window.supabase?.createClient) {
      setSyncStatus("⚠️ No se pudo cargar Supabase JS", "error");
      return;
    }

    if (!config.url || !config.publishableKey) {
      els.publishButton.disabled = true;
      setSyncStatus("🟡 Supabase pendiente de configurar", "warn");
      render();
      return;
    }

    db = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    publishDb = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "toolhub-community-auth-v2"
      }
    });

    const { data } = await db.auth.getSession();
    if (data?.session?.user) await checkAdmin(data.session.user);

    await loadAssets();
    emit("toolhub-assets-ready", { schemaV2: state.schemaV2 });
  }

  window.ToolHubAssets = {
    getDb: () => db,
    getState: () => state,
    getAsset: (id) => state.assets.find((asset) => String(asset.id) === String(id)) || null,
    safeUrl,
    normalizeTags,
    isNsfw,
    render,
    refresh: loadAssets,
    setSyncStatus,
    setAdminMessage,
    canDelete
  };

  init();
})();