(() => {
  "use strict";

  if (window.ToolHubAccount) return;

  const scriptUrl = document.currentScript?.src || location.href;
  const rootUrl = new URL("./", scriptUrl);
  const PROFILE_URL = new URL("profile.html", rootUrl).href;
  const CONFIG_URL = new URL("herramientas/assets-library/supabase-config.js?v=2", rootUrl).href;
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const state = {
    client: null,
    user: null,
    profile: null,
    readyPromise: null,
    favoriteIds: new Set(),
  };

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      const existing = marker ? document.querySelector(`script[${marker}]`) : null;
      if (existing) {
        if (existing.dataset.loaded === "1" || (src.includes("supabase-js") && window.supabase?.createClient)) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      if (marker) script.setAttribute(marker, "1");
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureClient() {
    if (state.client) return state.client;
    if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN, "data-toolhub-account-supabase");
    if (!window.TOOLHUB_SUPABASE) await loadScript(CONFIG_URL, "data-toolhub-account-config");
    const cfg = window.TOOLHUB_SUPABASE;
    if (!cfg?.url || !cfg?.publishableKey || !window.supabase?.createClient) throw new Error("Supabase no está configurado.");
    state.client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return state.client;
  }

  async function refreshUser() {
    const db = await ensureClient();
    const { data } = await db.auth.getUser();
    state.user = data?.user || null;
    state.profile = null;
    if (state.user) {
      const { data: profile } = await db
        .from("toolhub_profiles")
        .select("user_id,username,display_name,bio,avatar_url,reputation,created_at")
        .eq("user_id", state.user.id)
        .maybeSingle();
      state.profile = profile || null;
    }
    renderAccountButton();
    document.dispatchEvent(new CustomEvent("toolhub-account-changed", { detail: { user: state.user, profile: state.profile } }));
    return state.user;
  }

  function ready() {
    if (!state.readyPromise) {
      state.readyPromise = ensureClient().then(async (db) => {
        await refreshUser();
        db.auth.onAuthStateChange(() => setTimeout(refreshUser, 0));
        return state;
      }).catch((error) => {
        console.warn("ToolHub account:", error);
        return state;
      });
    }
    return state.readyPromise;
  }

  function profileHref() {
    const here = location.href;
    if (here === PROFILE_URL || location.pathname.endsWith("/profile.html")) return PROFILE_URL;
    const url = new URL(PROFILE_URL);
    url.searchParams.set("next", here);
    return url.href;
  }

  function injectStyles() {
    if (document.getElementById("toolhubAccountStyles")) return;
    const style = document.createElement("style");
    style.id = "toolhubAccountStyles";
    style.textContent = `
      .toolhub-account-link{height:44px;min-width:44px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--border);border-radius:11px;background:var(--panel);color:var(--text);text-decoration:none;font-size:.82rem;font-weight:800;white-space:nowrap;transition:.18s ease}
      .toolhub-account-link:hover{transform:translateY(-1px);border-color:rgba(117,91,255,.48);box-shadow:0 10px 28px rgba(38,20,100,.14)}
      .toolhub-account-avatar{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#6d3cff,#8f58ff);color:#fff;font-size:.72rem;font-weight:900;flex:0 0 27px}
      .toolhub-account-avatar img{width:100%;height:100%;object-fit:cover}
      .toolhub-account-rep{color:#a995ff;font-size:.72rem}
      .asset-card{position:relative}
      .toolhub-favorite-button{position:absolute;z-index:9;right:10px;top:10px;width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:rgba(8,10,16,.78);backdrop-filter:blur(8px);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:1.05rem;transition:.18s ease}
      .toolhub-favorite-button:hover{transform:scale(1.05);border-color:rgba(255,92,134,.55)}
      .toolhub-favorite-button.is-favorite{color:#ff5f8f;border-color:rgba(255,79,131,.5);background:rgba(65,13,31,.84)}
      @media(max-width:680px){.toolhub-account-label,.toolhub-account-rep{display:none}.toolhub-account-link{padding:0 8px}}
    `;
    document.head.appendChild(style);
  }

  function accountLabel() {
    return state.profile?.display_name || state.profile?.username || state.user?.email?.split("@")[0] || "Perfil";
  }

  function renderAccountButton() {
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return;
    injectStyles();
    let link = document.getElementById("toolhubAccountLink");
    if (!link) {
      link = document.createElement("a");
      link.id = "toolhubAccountLink";
      link.className = "toolhub-account-link";
      const admin = document.getElementById("toolhubAdminLock");
      admin ? admin.insertAdjacentElement("beforebegin", link) : headerActions.appendChild(link);
    }
    link.href = profileHref();
    const name = accountLabel();
    const initial = name.trim().charAt(0).toUpperCase() || "👤";
    const avatar = state.profile?.avatar_url
      ? `<span class="toolhub-account-avatar"><img src="${escapeHtml(state.profile.avatar_url)}" alt=""></span>`
      : `<span class="toolhub-account-avatar">${escapeHtml(initial)}</span>`;
    const rep = state.user ? `<span class="toolhub-account-rep">★ ${Number(state.profile?.reputation || 0)}</span>` : "";
    link.innerHTML = `${avatar}<span class="toolhub-account-label">${escapeHtml(state.user ? name : "Perfil")}</span>${rep}`;
    link.title = state.user ? `Abrir perfil de ${name}` : "Iniciar sesión o crear perfil";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
  }

  async function requireUser() {
    await ready();
    if (state.user) return state.user;
    location.href = profileHref();
    return null;
  }

  async function loadAssetFavorites(ids) {
    if (!state.user || !ids.length) return new Set();
    const db = await ensureClient();
    const { data, error } = await db
      .from("toolhub_favorites")
      .select("resource_key")
      .eq("user_id", state.user.id)
      .eq("resource_type", "asset")
      .in("resource_key", ids);
    if (error) return new Set();
    return new Set((data || []).map((row) => row.resource_key));
  }

  async function toggleFavorite(button, resource) {
    const user = await requireUser();
    if (!user) return;
    const db = await ensureClient();
    button.disabled = true;
    const active = button.classList.contains("is-favorite");
    let error = null;
    if (active) {
      ({ error } = await db.from("toolhub_favorites").delete()
        .eq("user_id", user.id).eq("resource_type", resource.type).eq("resource_key", resource.key));
    } else {
      ({ error } = await db.from("toolhub_favorites").upsert({
        user_id: user.id,
        resource_type: resource.type,
        resource_key: resource.key,
        title: resource.title || "",
        url: resource.url || location.href,
        metadata: resource.metadata || {}
      }, { onConflict: "user_id,resource_type,resource_key" }));
    }
    button.disabled = false;
    if (error) {
      console.warn("Favoritos:", error);
      button.title = `No se pudo guardar: ${error.message}`;
      return;
    }
    button.classList.toggle("is-favorite", !active);
    button.textContent = !active ? "♥" : "♡";
    button.setAttribute("aria-label", !active ? "Quitar de favoritos" : "Añadir a favoritos");
  }

  async function enhanceAssetCards(assets = []) {
    await ready();
    const assetMap = new Map((assets || []).map((asset) => [String(asset.id), asset]));
    const cards = [...document.querySelectorAll(".asset-card[data-asset-id]")];
    if (!cards.length) return;
    const ids = cards.map((card) => card.dataset.assetId).filter(Boolean);
    const favoriteIds = await loadAssetFavorites(ids);
    cards.forEach((card) => {
      if (card.querySelector(".toolhub-favorite-button")) return;
      const id = card.dataset.assetId;
      const asset = assetMap.get(String(id)) || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toolhub-favorite-button";
      const active = favoriteIds.has(id);
      button.classList.toggle("is-favorite", active);
      button.textContent = active ? "♥" : "♡";
      button.setAttribute("aria-label", active ? "Quitar de favoritos" : "Añadir a favoritos");
      button.title = active ? "Quitar de favoritos" : "Añadir a favoritos";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(button, {
          type: "asset",
          key: id,
          title: asset.name || card.querySelector(".asset-title")?.textContent?.trim() || "Asset",
          url: location.href,
          metadata: { category: asset.category || "", platform: asset.platform || "", preview_url: asset.preview_url || "" }
        });
      });
      card.appendChild(button);
    });
  }

  document.addEventListener("toolhub-assets-rendered", (event) => enhanceAssetCards(event.detail?.assets || []));
  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    ready().then(() => setTimeout(() => enhanceAssetCards(), 250));
  }, { once: true });

  window.ToolHubAccount = Object.freeze({
    ready,
    getClient: ensureClient,
    getUser: async () => { await ready(); return state.user; },
    getProfile: async () => { await ready(); return state.profile; },
    refresh: refreshUser,
    requireUser,
    profileUrl: PROFILE_URL,
    rootUrl: rootUrl.href,
  });

  if (document.readyState !== "loading") {
    injectStyles();
    ready().then(() => setTimeout(() => enhanceAssetCards(), 250));
  }
})();