(() => {
  "use strict";

  const config = window.TOOLHUB_SUPABASE;
  const supabaseApi = window.supabase;
  const PRIVATE_ROLES = new Set(["owner", "admin"]);
  const FIELDS = "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at,updated_at";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    gate: $("#privateAccessGate"),
    gateTitle: $("#privateGateTitle"),
    gateText: $("#privateGateText"),
    gateMessage: $("#privateGateMessage"),
    loginFields: $("#privateLoginFields"),
    loginEmail: $("#privateLoginEmail"),
    loginPassword: $("#privateLoginPassword"),
    loginButton: $("#privateLoginButton"),
    shell: $("#privateLibraryShell"),
    topbarStatus: $("#privateTopbarStatus"),
    topbarText: $("#privateTopbarText"),
    logoutButton: $("#privateLogoutButton"),
    navButtons: $$('[data-private-panel]'),
    panels: $$('[data-private-panel-name]'),
    form: $("#privateAssetForm"),
    publishButton: $("#privateAssetPublishButton"),
    search: $("#privateAssetSearch"),
    filterCategory: $("#privateFilterCategory"),
    filterPlatform: $("#privateFilterPlatform"),
    filterTags: $("#privateFilterTags"),
    clearFilters: $("#privateClearFilters"),
    grid: $("#privateAssetGrid"),
    empty: $("#privateAssetEmpty"),
    emptyTitle: $("#privateAssetEmptyTitle"),
    emptyText: $("#privateAssetEmptyText"),
    template: $("#privateAssetCardTemplate"),
    resultCount: $("#privateResultCount"),
    assetCount: $("#privateAssetCount"),
    tagCount: $("#privateTagCount"),
    categoryCount: $("#privateCategoryCount"),
    sync: $("#privateSyncStatus")
  };

  const state = {
    db: null,
    user: null,
    role: null,
    assets: [],
    search: "",
    category: "",
    platform: "",
    tags: new Set(),
    ready: false
  };

  function setGate(title, text, message = "", login = false) {
    els.gateTitle.textContent = title;
    els.gateText.textContent = text;
    els.gateMessage.textContent = message;
    els.loginFields.hidden = !login;
  }

  function setSync(text, mode = "") {
    els.sync.textContent = text;
    els.sync.className = "private-sync" + (mode ? ` ${mode}` : "");
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeTags(input) {
    const source = Array.isArray(input) ? input.join(",") : String(input || "");
    return [...new Set(
      source.split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 32))
    )].slice(0, 20);
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
          asset.category,
          asset.platform,
          asset.description,
          ...(Array.isArray(asset.tags) ? asset.tags : [])
        ].join(" ").toLowerCase();

        if (query && !haystack.includes(query)) return false;
        if (state.category && asset.category !== state.category) return false;
        if (state.platform && asset.platform !== state.platform) return false;
        if (state.tags.size) {
          const tags = new Set(Array.isArray(asset.tags) ? asset.tags : []);
          for (const selected of state.tags) if (!tags.has(selected)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function roleLabel(role) {
    return role === "owner" ? "Owner" : role === "admin" ? "Admin" : role || "";
  }

  async function checkRole(user) {
    if (!user || !state.db) return null;
    const { data, error } = await state.db
      .from("toolhub_admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.role || null;
  }

  function showAuthorized(user, role) {
    state.user = user;
    state.role = role;
    els.gate.hidden = true;
    els.shell.hidden = false;
    els.topbarText.textContent = `${roleLabel(role)} · acceso privado`;
    els.topbarStatus.classList.add("unlocked");
  }

  function showUnauthorized(message = "") {
    state.user = null;
    state.role = null;
    els.shell.hidden = true;
    els.gate.hidden = false;
    els.topbarText.textContent = "Acceso bloqueado";
    setGate(
      "Almacén bloqueado",
      "Inicia sesión con una cuenta Owner o Admin autorizada de ToolHub.",
      message,
      true
    );
    setTimeout(() => els.loginEmail?.focus({ preventScroll: true }), 30);
  }

  function setPanel(name) {
    els.navButtons.forEach((button) => {
      if (!button.dataset.privatePanel) return;
      button.classList.toggle("active", button.dataset.privatePanel === name);
    });
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.privatePanelName === name));
  }

  function renderStats() {
    els.assetCount.textContent = String(state.assets.length);
    els.tagCount.textContent = String(allTags().length);
    els.categoryCount.textContent = String(allCategories().length);
  }

  function renderFilters() {
    const current = state.category;
    els.filterCategory.innerHTML = '<option value="">Todas</option>';
    allCategories().forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.filterCategory.appendChild(option);
    });
    els.filterCategory.value = current;

    els.filterTags.replaceChildren();
    allTags().forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "private-tag-button";
      button.textContent = `#${tag}`;
      button.classList.toggle("active", state.tags.has(tag));
      button.addEventListener("click", () => {
        state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
        render();
      });
      els.filterTags.appendChild(button);
    });
  }

  async function deleteAsset(asset, card) {
    if (!confirm(`¿Eliminar definitivamente "${asset.name}" del almacén privado?`)) return;
    card.style.opacity = ".45";
    const { error } = await state.db.from("toolhub_private_assets").delete().eq("id", asset.id);
    if (error) {
      card.style.opacity = "";
      alert(`No se pudo eliminar: ${error.message}`);
      return;
    }
    state.assets = state.assets.filter((item) => item.id !== asset.id);
    render();
    setSync("✓ Asset privado eliminado", "ok");
  }

  function renderCards() {
    const assets = filteredAssets();
    els.grid.replaceChildren();
    els.resultCount.textContent = `${assets.length} ${assets.length === 1 ? "resultado" : "resultados"}`;

    if (!assets.length) {
      els.empty.hidden = false;
      els.emptyTitle.textContent = state.assets.length ? "No hay coincidencias" : "El almacén privado está vacío";
      els.emptyText.textContent = state.assets.length
        ? "Prueba otra búsqueda o restablece los filtros."
        : "Usa Crear para guardar la primera ficha privada.";
      return;
    }

    els.empty.hidden = true;
    assets.forEach((asset) => {
      const node = els.template.content.cloneNode(true);
      const card = node.querySelector(".private-card");
      const image = node.querySelector(".private-preview");
      const fallback = node.querySelector(".private-preview-fallback");
      const platform = node.querySelector(".private-platform");
      const category = node.querySelector(".private-category");
      const created = node.querySelector(".private-created");
      const title = node.querySelector(".private-title");
      const author = node.querySelector(".private-author");
      const description = node.querySelector(".private-description");
      const tagBox = node.querySelector(".private-card-tags");
      const authorLink = node.querySelector(".private-author-link");
      const downloadLink = node.querySelector(".private-download-link");
      const del = node.querySelector(".private-delete");

      platform.textContent = asset.platform || "No especificado";
      category.textContent = asset.category || "OTRO";
      title.textContent = asset.name || "Sin nombre";
      author.textContent = asset.author ? `por ${asset.author}` : "Autor no especificado";
      description.textContent = asset.description || "Sin notas.";

      const date = new Date(asset.created_at || "");
      created.textContent = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES");

      const authorUrl = safeUrl(asset.author_url);
      const downloadUrl = safeUrl(asset.download_url);
      authorLink.href = authorUrl || "#";
      downloadLink.href = downloadUrl || "#";
      authorLink.hidden = !authorUrl;
      downloadLink.hidden = !downloadUrl;

      const preview = safeUrl(asset.preview_url);
      fallback.hidden = false;
      if (preview) {
        image.src = preview;
        image.alt = `Preview de ${asset.name || "asset privado"}`;
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
  }

  function render() {
    renderStats();
    renderFilters();
    renderCards();
  }

  async function loadAssets() {
    setSync("Cargando almacén privado…");
    const { data, error } = await state.db
      .from("toolhub_private_assets")
      .select(FIELDS)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      const missingTable = error.code === "42P01" || /toolhub_private_assets/i.test(error.message || "");
      setSync(missingTable ? "Falta activar la tabla privada en Supabase" : `Error: ${error.message}`, "error");
      els.empty.hidden = false;
      els.emptyTitle.textContent = missingTable ? "Almacén privado pendiente de activar" : "No se pudo cargar";
      els.emptyText.textContent = missingTable
        ? "Ejecuta supabase/toolhub-private-assets.sql una vez en el SQL Editor de Supabase."
        : "Revisa la conexión y los permisos RLS.";
      return;
    }

    state.assets = Array.isArray(data) ? data : [];
    state.ready = true;
    render();
    setSync(`Privado · ${state.assets.length} ${state.assets.length === 1 ? "asset" : "assets"}`, "ok");
  }

  function formPayload() {
    const name = $("#privateAssetName").value.trim();
    const category = $("#privateAssetCategory").value;
    const author = $("#privateAssetAuthor").value.trim();
    const platform = $("#privateAssetPlatform").value || "No especificado";
    const authorRaw = $("#privateAssetAuthorUrl").value.trim();
    const previewRaw = $("#privateAssetPreview").value.trim();
    const downloadRaw = $("#privateAssetDownloadUrl").value.trim();
    const tags = normalizeTags($("#privateAssetTags").value);
    const description = $("#privateAssetDescription").value.trim();

    if (!name) throw new Error("Introduce un nombre.");
    if (!category) throw new Error("Selecciona una categoría.");

    const authorUrl = authorRaw ? safeUrl(authorRaw) : "";
    const previewUrl = previewRaw ? safeUrl(previewRaw) : "";
    const downloadUrl = downloadRaw ? safeUrl(downloadRaw) : "";
    if (authorRaw && !authorUrl) throw new Error("El enlace de origen no es válido.");
    if (previewRaw && !previewUrl) throw new Error("El enlace de preview no es válido.");
    if (downloadRaw && !downloadUrl) throw new Error("El enlace de descarga no es válido.");

    return {
      name,
      category,
      author,
      platform,
      author_url: authorUrl,
      preview_url: previewUrl,
      download_url: downloadUrl,
      tags,
      description
    };
  }

  async function initializeSession() {
    if (!config?.url || !config?.publishableKey || !supabaseApi?.createClient) {
      setGate("No se pudo iniciar", "Falta la configuración de Supabase.", "Revisa supabase-config.js.", false);
      els.topbarText.textContent = "Sin conexión";
      return;
    }

    state.db = supabaseApi.createClient(config.url, config.publishableKey);

    try {
      const { data, error } = await state.db.auth.getSession();
      if (error) throw error;
      const user = data.session?.user || null;
      if (!user) {
        showUnauthorized();
        return;
      }

      const role = await checkRole(user);
      if (!PRIVATE_ROLES.has(role)) {
        showUnauthorized("La sesión actual no tiene rol Owner/Admin para este almacén.");
        return;
      }

      showAuthorized(user, role);
      await loadAssets();
    } catch (error) {
      console.error(error);
      showUnauthorized(error?.message || "No se pudo verificar la sesión.");
    }
  }

  els.loginButton.addEventListener("click", async () => {
    if (!state.db) return;
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (!email || !password) {
      els.gateMessage.textContent = "Introduce email y contraseña.";
      return;
    }

    els.loginButton.disabled = true;
    els.gateMessage.textContent = "Comprobando acceso…";
    try {
      const { data, error } = await state.db.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error("No se pudo iniciar sesión.");
      const role = await checkRole(data.user);
      if (!PRIVATE_ROLES.has(role)) {
        await state.db.auth.signOut();
        throw new Error("Esta cuenta no tiene acceso al almacén privado.");
      }
      els.loginPassword.value = "";
      showAuthorized(data.user, role);
      await loadAssets();
    } catch (error) {
      els.gateMessage.textContent = error?.message || "No se pudo iniciar sesión.";
    } finally {
      els.loginButton.disabled = false;
    }
  });

  els.loginPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") els.loginButton.click();
  });

  els.logoutButton.addEventListener("click", async () => {
    if (!state.db) return;
    els.logoutButton.disabled = true;
    try {
      await state.db.auth.signOut();
      location.href = "index.html#asset-library";
    } finally {
      els.logoutButton.disabled = false;
    }
  });

  els.navButtons.forEach((button) => {
    if (!button.dataset.privatePanel) return;
    button.addEventListener("click", () => setPanel(button.dataset.privatePanel));
  });

  els.search.addEventListener("input", () => {
    state.search = els.search.value;
    renderCards();
  });

  els.filterCategory.addEventListener("change", () => {
    state.category = els.filterCategory.value;
    renderCards();
  });

  els.filterPlatform.addEventListener("change", () => {
    state.platform = els.filterPlatform.value;
    renderCards();
  });

  els.clearFilters.addEventListener("click", () => {
    state.category = "";
    state.platform = "";
    state.tags.clear();
    els.filterCategory.value = "";
    els.filterPlatform.value = "";
    render();
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.db || !PRIVATE_ROLES.has(state.role)) return;

    let payload;
    try {
      payload = formPayload();
    } catch (error) {
      setSync(error.message, "error");
      return;
    }

    els.publishButton.disabled = true;
    setSync("Guardando ficha privada…");
    const { data, error } = await state.db
      .from("toolhub_private_assets")
      .insert(payload)
      .select(FIELDS)
      .single();
    els.publishButton.disabled = false;

    if (error) {
      console.error(error);
      setSync(`No se pudo guardar: ${error.message}`, "error");
      return;
    }

    state.assets.unshift(data);
    els.form.reset();
    render();
    setSync("✓ Ficha guardada en el almacén privado", "ok");
  });

  initializeSession();
})();
