(() => {
  "use strict";

  const cfg = window.TOOLHUB_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) return;

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "toolhub-community-auth-v2",
    }
  });

  const state = { user: null, role: "user", assets: [], contributions: [], profiles: new Map(), filter: "pending" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function dateText(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" });
  }

  function safeUrl(value) {
    try {
      const parsed = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function roleLabel(role) {
    if (role === "owner") return { icon: "♛", label: "Owner", cls: "owner" };
    if (role === "admin") return { icon: "◆", label: "Admin", cls: "admin" };
    if (role === "official") return { icon: "✦", label: "Oficial", cls: "official" };
    return null;
  }

  function kindLabel(kind) {
    return ({
      new_resource: "Nuevo recurso",
      edit: "Edición / mejora",
      link_update: "Actualizar enlace",
      report_fix: "Corrección",
      preset: "Preset MatCap / Shader",
      site_suggestion: "Sitio / fuente sugerida",
      improvement: "Mejora de ToolHub",
      other: "Otro",
    })[kind] || kind || "Otro";
  }

  async function loadIdentity() {
    const { data } = await db.auth.getUser();
    state.user = data?.user || null;
    if (!state.user) return false;

    const { data: staff } = await db.from("toolhub_admins").select("role").eq("user_id", state.user.id).maybeSingle();
    state.role = staff?.role || "user";
    return true;
  }

  function installRoleBadge() {
    const identity = $(".profile-identity");
    if (!identity) return;
    $("#profileRoleBadge")?.remove();
    const role = roleLabel(state.role);
    const avatar = $("#profileAvatarButton");
    avatar?.classList.toggle("has-staff-role", Boolean(role));
    if (!role) return;

    const badge = document.createElement("span");
    badge.id = "profileRoleBadge";
    badge.className = `profile-role-badge ${role.cls}`;
    badge.innerHTML = `<span class="profile-role-emblem" aria-hidden="true">${role.icon}</span><span>${role.label}</span>`;
    $("#profileHandle")?.insertAdjacentElement("afterend", badge);
  }

  function installExtraContributionKinds() {
    const select = $("#contributionKind");
    if (!select || select.querySelector('option[value="site_suggestion"]')) return;
    const site = new Option("Sitio / fuente para añadir", "site_suggestion");
    const improvement = new Option("Mejora de ToolHub", "improvement");
    select.add(site, select.querySelector('option[value="other"]'));
    select.add(improvement, select.querySelector('option[value="other"]'));
  }

  async function loadAssets() {
    if (!state.user) return;
    const { data, error } = await db
      .from("assets")
      .select("id,name,category,author,author_url,download_url,preview_url,created_at,submitted_by")
      .eq("submitted_by", state.user.id)
      .order("created_at", { ascending:false })
      .limit(500);
    state.assets = error ? [] : (data || []);
  }

  function installAssetStat() {
    const stats = $("#profileStats");
    if (!stats) return;
    stats.classList.add("profile-stats-v2");
    const studioStat = $('[data-stat="creations"]')?.parentElement;
    const studioLabel = studioStat?.querySelector("span");
    if (studioLabel) studioLabel.textContent = "Creaciones Studio";

    let item = $("#profileAssetContributionStat");
    if (!item) {
      item = document.createElement("div");
      item.id = "profileAssetContributionStat";
      item.innerHTML = '<strong id="profileAssetContributionCount">0</strong><span>Assets aportados</span>';
      stats.appendChild(item);
    }
    $("#profileAssetContributionCount").textContent = String(state.assets.length);
  }

  function ensureAssetsPanel() {
    const nav = $(".profile-nav");
    const content = $(".profile-content");
    if (!nav || !content) return;

    let button = $('[data-profile-tab="assets"]');
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.profileTab = "assets";
      button.textContent = "▤ Mis aportes";
      const before = $('[data-profile-tab="contributions"]', nav);
      before ? nav.insertBefore(button, before) : nav.appendChild(button);
      button.addEventListener("click", () => activateTab("assets"));
    }

    let panel = $('[data-profile-panel="assets"]');
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "profile-panel";
      panel.dataset.profilePanel = "assets";
      panel.innerHTML = `<div class="profile-section-head"><div><span class="profile-kicker">BIBLIOTECA</span><h2>Assets que has aportado</h2><p>Recursos de la Biblioteca de Assets publicados desde tu cuenta.</p></div></div><div id="profileAssetsList" class="profile-list"></div>`;
      const contributionPanel = $('[data-profile-panel="contributions"]', content);
      contributionPanel ? content.insertBefore(panel, contributionPanel) : content.appendChild(panel);
    }
  }

  function activateTab(name) {
    $$('[data-profile-tab]').forEach((button) => button.classList.toggle("active", button.dataset.profileTab === name));
    $$('[data-profile-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.profilePanel === name));
  }

  function renderAssets() {
    const list = $("#profileAssetsList");
    if (!list) return;
    if (!state.assets.length) {
      list.innerHTML = '<div class="profile-empty">Todavía no hay assets asociados a esta cuenta.</div>';
      return;
    }

    list.innerHTML = state.assets.map((asset) => {
      const preview = safeUrl(asset.preview_url);
      const authorUrl = safeUrl(asset.author_url);
      const downloadUrl = safeUrl(asset.download_url);
      return `<article class="profile-list-item">
        <div class="profile-asset-row-main">
          ${preview ? `<img class="profile-asset-preview" src="${escapeHtml(preview)}" alt="">` : ""}
          <div class="profile-asset-row-copy"><h3>${escapeHtml(asset.name)}</h3><p>${escapeHtml(asset.category || "Sin categoría")} · ${dateText(asset.created_at)}${asset.author ? ` · autor original: ${escapeHtml(asset.author)}` : ""}</p><div class="profile-item-meta"><span class="profile-chip">Aportado por ti</span></div></div>
        </div>
        <div class="profile-item-actions">${authorUrl ? `<a class="profile-mini" href="${escapeHtml(authorUrl)}" target="_blank" rel="noopener noreferrer">Origen ↗</a>` : ""}${downloadUrl ? `<a class="profile-mini primary" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>` : ""}</div>
      </article>`;
    }).join("");
  }

  async function loadReviewData() {
    if (state.role !== "owner") return;
    let query = db.from("toolhub_contributions").select("*").order("created_at", { ascending:false }).limit(250);
    if (state.filter !== "all") query = query.eq("status", state.filter);
    const { data, error } = await query;
    state.contributions = error ? [] : (data || []);

    const ids = [...new Set(state.contributions.map((item) => item.user_id).filter(Boolean))];
    state.profiles = new Map();
    if (ids.length) {
      const { data: profiles } = await db.from("toolhub_profiles").select("user_id,username,display_name,avatar_url,reputation").in("user_id", ids);
      (profiles || []).forEach((profile) => state.profiles.set(profile.user_id, profile));
    }
  }

  function ensureOwnerReviewPanel() {
    if (state.role !== "owner") return;
    const nav = $(".profile-nav");
    const content = $(".profile-content");
    if (!nav || !content) return;

    let button = $('[data-profile-tab="owner-review"]');
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "profile-nav-with-badge";
      button.dataset.profileTab = "owner-review";
      button.innerHTML = '♛ Revisión <span class="profile-nav-badge" id="ownerPendingBadge">0</span>';
      const settings = $('[data-profile-tab="settings"]', nav);
      settings ? nav.insertBefore(button, settings) : nav.appendChild(button);
      button.addEventListener("click", () => activateTab("owner-review"));
    }

    let panel = $('[data-profile-panel="owner-review"]');
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "profile-panel";
      panel.dataset.profilePanel = "owner-review";
      panel.innerHTML = `<div class="profile-section-head"><div><span class="profile-kicker">OWNER · MODERACIÓN</span><h2>Revisar contribuciones</h2><p>Aquí aparecen recursos, sitios, correcciones, presets y mejoras propuestas por la comunidad.</p></div></div>
        <div class="profile-review-toolbar"><select class="profile-review-filter" id="ownerReviewFilter"><option value="pending">Pendientes</option><option value="all">Todas</option><option value="approved">Aprobadas</option><option value="rejected">Rechazadas</option></select><span class="profile-review-status" id="ownerReviewStatus"></span></div>
        <div id="ownerReviewList" class="profile-list"></div>`;
      const settingsPanel = $('[data-profile-panel="settings"]', content);
      settingsPanel ? content.insertBefore(panel, settingsPanel) : content.appendChild(panel);
      $("#ownerReviewFilter", panel).addEventListener("change", async (event) => {
        state.filter = event.target.value;
        await refreshReview();
      });
    }
  }

  async function pendingCount() {
    if (state.role !== "owner") return;
    const { count } = await db.from("toolhub_contributions").select("id", { count:"exact", head:true }).eq("status", "pending");
    const badge = $("#ownerPendingBadge");
    if (badge) badge.textContent = String(count || 0);
  }

  function renderReview() {
    const list = $("#ownerReviewList");
    if (!list) return;
    if (!state.contributions.length) {
      list.innerHTML = `<div class="profile-empty">No hay contribuciones ${state.filter === "pending" ? "pendientes" : "en este filtro"}.</div>`;
      return;
    }

    list.innerHTML = state.contributions.map((item) => {
      const profile = state.profiles.get(item.user_id) || {};
      const userName = profile.display_name || profile.username || "Usuario";
      const statusClass = item.status === "approved" ? "ok" : item.status === "rejected" ? "bad" : "warn";
      const statusLabel = item.status === "approved" ? "Aprobada" : item.status === "rejected" ? "Rechazada" : "Pendiente";
      const canReview = item.status === "pending";
      return `<article class="profile-list-item profile-contribution-card" data-review-id="${item.id}">
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(userName)} · ${dateText(item.created_at)}</p><div class="profile-item-meta"><span class="profile-chip">${escapeHtml(kindLabel(item.kind))}</span><span class="profile-chip ${statusClass}">${statusLabel}</span>${profile.reputation != null ? `<span class="profile-chip">★ ${Number(profile.reputation || 0)}</span>` : ""}</div><div class="profile-contribution-description">${escapeHtml(item.description || "Sin descripción.")}</div>${item.target_key ? `<p style="margin-top:8px">Destino / referencia: ${escapeHtml(item.target_key)}</p>` : ""}</div>
        <div class="profile-contribution-review">${canReview ? `<label>Reputación al aprobar<input type="number" min="0" max="500" step="1" value="10" data-review-rep></label><div class="profile-review-actions"><button class="profile-mini primary" type="button" data-review-approve>✓ Aprobar</button><button class="profile-mini danger" type="button" data-review-reject>✕ Rechazar</button></div>` : `<span class="profile-chip ${statusClass}">${statusLabel}${item.reputation_awarded ? ` · +${item.reputation_awarded} rep.` : ""}</span>`}</div>
      </article>`;
    }).join("");

    $$('[data-review-approve]', list).forEach((button) => button.addEventListener("click", () => reviewContribution(button.closest('[data-review-id]'), "approved")));
    $$('[data-review-reject]', list).forEach((button) => button.addEventListener("click", () => reviewContribution(button.closest('[data-review-id]'), "rejected")));
  }

  function setReviewStatus(text, mode = "") {
    const el = $("#ownerReviewStatus");
    if (!el) return;
    el.textContent = text || "";
    el.className = "profile-review-status" + (mode ? ` ${mode}` : "");
  }

  async function reviewContribution(card, status) {
    if (!card || state.role !== "owner" || !state.user) return;
    const id = card.dataset.reviewId;
    const rep = status === "approved" ? Math.max(0, Math.min(500, Number($('[data-review-rep]', card)?.value || 0))) : 0;
    setReviewStatus(status === "approved" ? "Aprobando…" : "Rechazando…");
    $$('button', card).forEach((button) => button.disabled = true);

    const { error } = await db.from("toolhub_contributions").update({
      status,
      reputation_awarded: rep,
      reviewer_id: state.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      setReviewStatus(error.message, "error");
      $$('button', card).forEach((button) => button.disabled = false);
      return;
    }

    setReviewStatus(status === "approved" ? `Contribución aprobada${rep ? ` · +${rep} reputación` : ""}.` : "Contribución rechazada.", "ok");
    await refreshReview();
  }

  async function refreshReview() {
    await loadReviewData();
    renderReview();
    await pendingCount();
  }

  async function boot() {
    const logged = await loadIdentity();
    if (!logged) return;
    installRoleBadge();
    installExtraContributionKinds();
    await loadAssets();
    installAssetStat();
    ensureAssetsPanel();
    renderAssets();
    if (state.role === "owner") {
      ensureOwnerReviewPanel();
      await refreshReview();
    }
  }

  db.auth.onAuthStateChange(() => setTimeout(boot, 40));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
