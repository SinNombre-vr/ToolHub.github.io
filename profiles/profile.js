(() => {
  "use strict";

  const cfg = window.TOOLHUB_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) {
    document.getElementById("authMessage").textContent = "No se pudo conectar con Supabase.";
    return;
  }

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const state = { user: null, profile: null, favorites: [], collections: [], contributions: [], creations: [], reputation: [] };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const authShell = $("#profileAuthShell");
  const dashboard = $("#profileDashboard");
  const authMessage = $("#authMessage");

  function setMessage(el, text, mode = "") {
    if (!el) return;
    el.textContent = text || "";
    el.className = "profile-message" + (el.classList.contains("inline") ? " inline" : "") + (mode ? ` ${mode}` : "");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function dateText(value) {
    const d = new Date(value || "");
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  }

  function setAuthView(loggedIn) {
    authShell.hidden = loggedIn;
    dashboard.hidden = !loggedIn;
  }

  function switchAuthTab(name) {
    $$('[data-auth-tab]').forEach((b) => b.classList.toggle("active", b.dataset.authTab === name));
    $("#profileLoginForm").hidden = name !== "login";
    $("#profileRegisterForm").hidden = name !== "register";
    setMessage(authMessage, "");
  }

  $$('[data-auth-tab]').forEach((button) => button.addEventListener("click", () => switchAuthTab(button.dataset.authTab)));

  $("#profileLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(authMessage, "Entrando…");
    const { error } = await db.auth.signInWithPassword({ email: $("#loginEmail").value.trim(), password: $("#loginPassword").value });
    if (error) return setMessage(authMessage, error.message, "error");
    setMessage(authMessage, "Sesión iniciada.", "ok");
    await boot();
  });

  $("#profileRegisterForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("#registerUsername").value.trim();
    const displayName = $("#registerDisplayName").value.trim();
    setMessage(authMessage, "Creando cuenta…");
    const { data, error } = await db.auth.signUp({
      email: $("#registerEmail").value.trim(),
      password: $("#registerPassword").value,
      options: { data: { username, display_name: displayName, name: displayName } }
    });
    if (error) return setMessage(authMessage, error.message, "error");
    if (!data.session) {
      setMessage(authMessage, "Cuenta creada. Revisa tu correo para confirmar el acceso y después inicia sesión.", "ok");
      switchAuthTab("login");
      return;
    }
    await boot();
  });

  $("#profileLogout").addEventListener("click", async () => {
    await db.auth.signOut();
    state.user = null; state.profile = null;
    setAuthView(false);
    switchAuthTab("login");
  });

  $$('[data-profile-tab]').forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.profileTab;
    $$('[data-profile-tab]').forEach((b) => b.classList.toggle("active", b === button));
    $$('[data-profile-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.profilePanel === target));
  }));

  async function loadProfile() {
    const { data, error } = await db.from("toolhub_profiles").select("*").eq("user_id", state.user.id).maybeSingle();
    if (error) throw error;
    state.profile = data;
  }

  async function loadAll() {
    const uid = state.user.id;
    const [favorites, collections, contributions, creations, reputation] = await Promise.all([
      db.from("toolhub_favorites").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("toolhub_collections").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("toolhub_contributions").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("toolhub_creations").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("toolhub_reputation_events").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    state.favorites = favorites.data || [];
    state.collections = collections.data || [];
    state.contributions = contributions.data || [];
    state.creations = creations.data || [];
    state.reputation = reputation.data || [];
  }

  function renderIdentity() {
    const p = state.profile || {};
    const name = p.display_name || p.username || state.user.email?.split("@")[0] || "ToolHub User";
    $("#profileDisplayTitle").textContent = name;
    $("#profileHandle").textContent = `@${p.username || "usuario"}`;
    $("#profileBioPreview").textContent = p.bio || "Sin bio todavía.";
    $("#profileReputation").textContent = String(p.reputation || 0);
    $("#profileAvatarFallback").textContent = name.charAt(0).toUpperCase() || "T";
    const image = $("#profileAvatarImage");
    if (p.avatar_url) { image.src = p.avatar_url; image.hidden = false; $("#profileAvatarFallback").hidden = true; }
    else { image.hidden = true; $("#profileAvatarFallback").hidden = false; }
    $("#profileUsername").value = p.username || "";
    $("#profileDisplayName").value = p.display_name || "";
    $("#profileBio").value = p.bio || "";
    $("#bioCount").textContent = String((p.bio || "").length);
  }

  function renderStats() {
    const counts = { favorites: state.favorites.length, collections: state.collections.length, contributions: state.contributions.length, creations: state.creations.length };
    Object.entries(counts).forEach(([key, value]) => { const el = $(`[data-stat="${key}"]`); if (el) el.textContent = String(value); });
    $("#overviewReputation").textContent = `${state.profile?.reputation || 0} reputación`;
    $("#overviewCreations").textContent = `${counts.creations} ${counts.creations === 1 ? "creación" : "creaciones"}`;
    $("#overviewCollections").textContent = `${counts.collections} ${counts.collections === 1 ? "colección" : "colecciones"}`;
    $("#overviewContributions").textContent = `${counts.contributions} ${counts.contributions === 1 ? "contribución" : "contribuciones"}`;
  }

  function empty(text) { return `<div class="profile-empty">${escapeHtml(text)}</div>`; }

  function renderReputation() {
    const list = $("#reputationList");
    if (!state.reputation.length) { list.innerHTML = empty("Todavía no hay movimientos de reputación."); return; }
    list.innerHTML = state.reputation.map((item) => `<div class="rep-row"><span>${escapeHtml(item.reason)}</span><strong>${item.delta > 0 ? "+" : ""}${item.delta}</strong></div>`).join("");
  }

  function collectionOptions() {
    return state.collections.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  }

  function renderFavorites() {
    const list = $("#favoritesList");
    if (!state.favorites.length) { list.innerHTML = empty("Aún no tienes favoritos. Usa el corazón en la biblioteca para guardar recursos."); return; }
    list.innerHTML = state.favorites.map((fav) => `
      <article class="profile-list-item" data-favorite-id="${fav.id}">
        <div><h3>${escapeHtml(fav.title || fav.resource_key)}</h3><p>${escapeHtml(fav.resource_type)} · guardado ${dateText(fav.created_at)}</p><div class="profile-item-meta"><span class="profile-chip">${escapeHtml(fav.resource_type)}</span></div></div>
        <div class="profile-item-actions">
          ${fav.url ? `<a class="profile-mini primary" href="${escapeHtml(fav.url)}">Abrir</a>` : ""}
          ${state.collections.length ? `<select class="favorite-collection-select" aria-label="Colección"><option value="">Añadir a…</option>${collectionOptions()}</select><button class="profile-mini" data-add-favorite-collection="${fav.id}" type="button">Guardar</button>` : ""}
          <button class="profile-mini danger" data-delete-favorite="${fav.id}" type="button">Quitar</button>
        </div>
      </article>`).join("");

    $$('[data-delete-favorite]', list).forEach((button) => button.addEventListener("click", () => deleteFavorite(Number(button.dataset.deleteFavorite))));
    $$('[data-add-favorite-collection]', list).forEach((button) => button.addEventListener("click", () => addFavoriteToCollection(Number(button.dataset.addFavoriteCollection), button)));
  }

  async function deleteFavorite(id) {
    const { error } = await db.from("toolhub_favorites").delete().eq("id", id).eq("user_id", state.user.id);
    if (error) return alert(error.message);
    state.favorites = state.favorites.filter((item) => item.id !== id);
    renderFavorites(); renderStats();
  }

  async function addFavoriteToCollection(id, button) {
    const fav = state.favorites.find((item) => item.id === id);
    const select = button.previousElementSibling;
    const collectionId = select?.value;
    if (!fav || !collectionId) return;
    const { error } = await db.from("toolhub_collection_items").upsert({
      collection_id: collectionId, resource_type: fav.resource_type, resource_key: fav.resource_key,
      title: fav.title, url: fav.url, metadata: fav.metadata || {}
    }, { onConflict: "collection_id,resource_type,resource_key" });
    if (error) return alert(error.message);
    button.textContent = "✓ Guardado";
    setTimeout(() => button.textContent = "Guardar", 1200);
    renderCollections();
  }

  async function renderCollections() {
    const list = $("#collectionsList");
    if (!state.collections.length) { list.innerHTML = empty("Crea tu primera colección para organizar recursos."); return; }
    const ids = state.collections.map((c) => c.id);
    const { data: items } = await db.from("toolhub_collection_items").select("*").in("collection_id", ids).order("created_at", { ascending: false });
    const grouped = new Map(ids.map((id) => [id, []]));
    (items || []).forEach((item) => grouped.get(item.collection_id)?.push(item));
    list.innerHTML = state.collections.map((collection) => {
      const child = grouped.get(collection.id) || [];
      return `<article class="profile-list-item" data-collection-id="${collection.id}">
        <div><h3>${escapeHtml(collection.name)}</h3><p>${escapeHtml(collection.description || "Sin descripción")}</p><div class="profile-item-meta"><span class="profile-chip ${collection.is_public ? "ok" : ""}">${collection.is_public ? "Pública" : "Privada"}</span><span class="profile-chip">${child.length} elementos</span></div>
          ${child.length ? `<div class="collection-items">${child.slice(0,8).map((item) => `<div class="collection-item-row"><span>${escapeHtml(item.title || item.resource_key)}</span><button class="profile-mini danger" data-remove-collection-item="${item.id}" type="button">Quitar</button></div>`).join("")}</div>` : ""}
        </div>
        <div class="profile-item-actions"><button class="profile-mini" data-toggle-collection="${collection.id}" type="button">${collection.is_public ? "Hacer privada" : "Hacer pública"}</button><button class="profile-mini danger" data-delete-collection="${collection.id}" type="button">Eliminar</button></div>
      </article>`;
    }).join("");
    $$('[data-toggle-collection]', list).forEach((button) => button.addEventListener("click", () => toggleCollection(button.dataset.toggleCollection)));
    $$('[data-delete-collection]', list).forEach((button) => button.addEventListener("click", () => deleteCollection(button.dataset.deleteCollection)));
    $$('[data-remove-collection-item]', list).forEach((button) => button.addEventListener("click", async () => {
      await db.from("toolhub_collection_items").delete().eq("id", Number(button.dataset.removeCollectionItem)); renderCollections();
    }));
  }

  $("#newCollectionButton").addEventListener("click", () => { $("#collectionForm").hidden = false; $("#collectionName").focus(); });
  $("#cancelCollection").addEventListener("click", () => { $("#collectionForm").hidden = true; $("#collectionForm").reset(); });
  $("#collectionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = { user_id: state.user.id, name: $("#collectionName").value.trim(), description: $("#collectionDescription").value.trim(), is_public: $("#collectionPublic").checked };
    const { data, error } = await db.from("toolhub_collections").insert(payload).select().single();
    if (error) return alert(error.message);
    state.collections.unshift(data); $("#collectionForm").reset(); $("#collectionForm").hidden = true;
    renderCollections(); renderFavorites(); renderStats();
  });

  async function toggleCollection(id) {
    const collection = state.collections.find((c) => c.id === id); if (!collection) return;
    const { error } = await db.from("toolhub_collections").update({ is_public: !collection.is_public }).eq("id", id).eq("user_id", state.user.id);
    if (error) return alert(error.message); collection.is_public = !collection.is_public; renderCollections();
  }

  async function deleteCollection(id) {
    if (!confirm("¿Eliminar esta colección y sus elementos?")) return;
    const { error } = await db.from("toolhub_collections").delete().eq("id", id).eq("user_id", state.user.id);
    if (error) return alert(error.message); state.collections = state.collections.filter((c) => c.id !== id); renderCollections(); renderFavorites(); renderStats();
  }

  function creationTarget(type) {
    if (type === "matcap") return "herramientas/imagenes/matcap.html";
    if (type === "shader") return "herramientas/unity/shader-generator.html";
    if (type === "normal_map") return "herramientas/imagenes/normal-map.html";
    return "index.html#herramientas";
  }

  function renderCreations() {
    const list = $("#creationsList");
    if (!state.creations.length) { list.innerHTML = empty("Guarda una configuración desde MatCap Studio o Shader Studio y aparecerá aquí."); return; }
    list.innerHTML = state.creations.map((item) => `<article class="profile-list-item"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.creation_type)} · ${dateText(item.updated_at || item.created_at)}</p><div class="profile-item-meta"><span class="profile-chip">${escapeHtml(item.creation_type)}</span><span class="profile-chip ${item.visibility === "public" ? "ok" : ""}">${item.visibility === "public" ? "Pública" : "Privada"}</span></div></div><div class="profile-item-actions"><button class="profile-mini primary" data-open-creation="${item.id}" type="button">Abrir</button><button class="profile-mini" data-download-creation="${item.id}" type="button">JSON</button><button class="profile-mini" data-toggle-creation="${item.id}" type="button">${item.visibility === "public" ? "Privada" : "Pública"}</button><button class="profile-mini danger" data-delete-creation="${item.id}" type="button">Eliminar</button></div></article>`).join("");
    $$('[data-open-creation]', list).forEach((b) => b.addEventListener("click", () => openCreation(b.dataset.openCreation)));
    $$('[data-download-creation]', list).forEach((b) => b.addEventListener("click", () => downloadCreation(b.dataset.downloadCreation)));
    $$('[data-toggle-creation]', list).forEach((b) => b.addEventListener("click", () => toggleCreation(b.dataset.toggleCreation)));
    $$('[data-delete-creation]', list).forEach((b) => b.addEventListener("click", () => deleteCreation(b.dataset.deleteCreation)));
  }

  function openCreation(id) {
    const item = state.creations.find((c) => c.id === id); if (!item) return;
    try { localStorage.setItem(`toolhub_creator_import_${item.creation_type}`, JSON.stringify(item.settings || {})); } catch (_) {}
    location.href = `${creationTarget(item.creation_type)}?loadProfileCreation=1`;
  }

  function downloadCreation(id) {
    const item = state.creations.find((c) => c.id === id); if (!item) return;
    const blob = new Blob([JSON.stringify({ toolhub: 1, type: item.creation_type, name: item.name, settings: item.settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${item.name.replace(/[^a-z0-9-_]+/gi, "-")}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  async function toggleCreation(id) {
    const item = state.creations.find((c) => c.id === id); if (!item) return;
    const visibility = item.visibility === "public" ? "private" : "public";
    const { error } = await db.from("toolhub_creations").update({ visibility }).eq("id", id).eq("user_id", state.user.id);
    if (error) return alert(error.message); item.visibility = visibility; renderCreations();
  }

  async function deleteCreation(id) {
    if (!confirm("¿Eliminar esta creación guardada?")) return;
    const { error } = await db.from("toolhub_creations").delete().eq("id", id).eq("user_id", state.user.id);
    if (error) return alert(error.message); state.creations = state.creations.filter((c) => c.id !== id); renderCreations(); renderStats();
  }

  function renderContributions() {
    const list = $("#contributionsList");
    if (!state.contributions.length) { list.innerHTML = empty("No has enviado contribuciones todavía."); return; }
    list.innerHTML = state.contributions.map((item) => {
      const cls = item.status === "approved" ? "ok" : item.status === "rejected" ? "bad" : "warn";
      const label = item.status === "approved" ? "Aprobada" : item.status === "rejected" ? "Rechazada" : "Pendiente";
      return `<article class="profile-list-item"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || item.kind)}</p><div class="profile-item-meta"><span class="profile-chip">${escapeHtml(item.kind)}</span><span class="profile-chip ${cls}">${label}</span>${item.reputation_awarded ? `<span class="profile-chip ok">+${item.reputation_awarded} rep.</span>` : ""}</div></div><span class="profile-chip">${dateText(item.created_at)}</span></article>`;
    }).join("");
  }

  $("#contributionForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const msg = $("#contributionMessage"); setMessage(msg, "Enviando…");
    const payload = { user_id: state.user.id, kind: $("#contributionKind").value, title: $("#contributionTitle").value.trim(), description: $("#contributionDescription").value.trim(), target_type: "", target_key: "" };
    const { data, error } = await db.from("toolhub_contributions").insert(payload).select().single();
    if (error) return setMessage(msg, error.message, "error");
    state.contributions.unshift(data); event.target.reset(); setMessage(msg, "Contribución enviada para revisión.", "ok"); renderContributions(); renderStats();
  });

  $("#profileBio").addEventListener("input", () => $("#bioCount").textContent = String($("#profileBio").value.length));
  $("#profileSettingsForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const msg = $("#profileSaveMessage"); setMessage(msg, "Guardando…");
    const update = { username: $("#profileUsername").value.trim(), display_name: $("#profileDisplayName").value.trim(), bio: $("#profileBio").value.trim() };
    const { data, error } = await db.from("toolhub_profiles").update(update).eq("user_id", state.user.id).select().single();
    if (error) return setMessage(msg, error.message, "error"); state.profile = data; renderIdentity(); setMessage(msg, "Perfil actualizado.", "ok");
  });

  $("#profileAvatarButton").addEventListener("click", () => $("#profileAvatarInput").click());
  $("#profileAvatarInput").addEventListener("change", async () => {
    const file = $("#profileAvatarInput").files?.[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) return alert("El avatar no puede superar 3 MB.");
    const ext = (file.name.split(".").pop() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const path = `${state.user.id}/avatar.${ext}`;
    const { error: uploadError } = await db.storage.from("profile-avatars").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (uploadError) return alert(uploadError.message);
    const { data } = db.storage.from("profile-avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { data: profile, error } = await db.from("toolhub_profiles").update({ avatar_url: url }).eq("user_id", state.user.id).select().single();
    if (error) return alert(error.message); state.profile = profile; renderIdentity();
  });

  function renderAll() {
    renderIdentity(); renderStats(); renderReputation(); renderFavorites(); renderCollections(); renderCreations(); renderContributions();
  }

  async function boot() {
    const { data } = await db.auth.getUser();
    state.user = data?.user || null;
    if (!state.user) { setAuthView(false); return; }
    setAuthView(true);
    try { await loadProfile(); await loadAll(); renderAll(); }
    catch (error) { console.error(error); alert(`No se pudo cargar el perfil: ${error.message}`); }
  }

  db.auth.onAuthStateChange(() => setTimeout(boot, 0));
  boot();
})();