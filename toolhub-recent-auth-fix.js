(() => {
  "use strict";

  if (window.__TOOLHUB_RECENT_AUTH_FIX__) return;
  window.__TOOLHUB_RECENT_AUTH_FIX__ = true;

  const list = document.querySelector(".toolhub-recent-list");
  const rail = document.querySelector(".toolhub-recent-rail");
  if (!list || !rail) return;

  const originalRefresh = rail.querySelector(".toolhub-recent-refresh");
  let refreshButton = originalRefresh;

  function safeUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
    if (typeof value === "string") return value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    return [];
  }

  function isNsfw(asset) {
    return normalizeTags(asset?.tags).includes("nsfw");
  }

  function timeAgo(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "fecha desconocida";
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "ahora mismo";
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} ${days === 1 ? "día" : "días"}`;
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  }

  function isNew(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
  }

  function makeAssetTitle(asset) {
    const title = document.createElement("a");
    title.className = "toolhub-recent-title toolhub-recent-title-link";
    title.textContent = asset.name || "Asset sin nombre";
    title.href = `biblioteca-assets.html?asset=${encodeURIComponent(String(asset.id || ""))}`;
    title.title = "Ver únicamente este asset en el almacén";
    title.style.textDecoration = "none";
    return title;
  }

  function renderStatus(text) {
    list.replaceChildren();
    const status = document.createElement("div");
    status.className = "toolhub-recent-status";
    status.textContent = text;
    list.appendChild(status);
  }

  function renderLoading() {
    list.replaceChildren();
    for (let i = 0; i < 5; i += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "toolhub-recent-skeleton";
      list.appendChild(skeleton);
    }
  }

  function renderAssets(assets) {
    if (!assets.length) {
      renderStatus("Todavía no hay incorporaciones públicas para mostrar.");
      return;
    }

    list.replaceChildren();
    assets.forEach((asset) => {
      const item = document.createElement("article");
      item.className = "toolhub-recent-item";
      item.dataset.assetId = String(asset.id || "");

      const content = document.createElement("div");
      content.className = "toolhub-recent-content";

      const title = makeAssetTitle(asset);

      const meta = document.createElement("div");
      meta.className = "toolhub-recent-meta";
      const category = document.createElement("span");
      category.className = "toolhub-recent-category";
      category.textContent = asset.category || "Asset";
      const sep1 = document.createElement("span");
      sep1.className = "toolhub-recent-separator";
      sep1.textContent = "•";
      const author = document.createElement("span");
      author.className = "toolhub-recent-author";
      author.textContent = asset.author || asset.platform || "ToolHub";
      const sep2 = document.createElement("span");
      sep2.className = "toolhub-recent-separator";
      sep2.textContent = "•";
      const ago = document.createElement("span");
      ago.textContent = timeAgo(asset.created_at);
      meta.append(category, sep1, author, sep2, ago);
      content.append(title, meta);

      const previewWrap = document.createElement("div");
      previewWrap.className = "toolhub-recent-preview-wrap";
      const previewUrl = safeUrl(asset.preview_url);
      if (previewUrl) {
        const image = document.createElement("img");
        image.className = "toolhub-recent-preview";
        image.src = previewUrl;
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
          image.remove();
          const fallback = document.createElement("span");
          fallback.className = "toolhub-recent-preview-fallback";
          fallback.textContent = "⬡";
          previewWrap.prepend(fallback);
        }, { once: true });
        previewWrap.appendChild(image);
      } else {
        const fallback = document.createElement("span");
        fallback.className = "toolhub-recent-preview-fallback";
        fallback.textContent = "⬡";
        previewWrap.appendChild(fallback);
      }

      if (isNew(asset.created_at)) {
        const badge = document.createElement("span");
        badge.className = "toolhub-recent-new";
        badge.textContent = "NUEVO";
        previewWrap.appendChild(badge);
      }

      item.append(content, previewWrap);
      list.appendChild(item);
    });
  }

  async function getClient() {
    if (window.ToolHubAccount?.getClient) return window.ToolHubAccount.getClient();
    const cfg = window.TOOLHUB_SUPABASE || {};
    if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) throw new Error("Supabase no está disponible.");
    return window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async function loadRecent() {
    renderLoading();
    if (refreshButton) refreshButton.disabled = true;
    try {
      if (window.ToolHubAccount?.ready) await window.ToolHubAccount.ready();
      const client = await getClient();
      let query = client
        .from("assets")
        .select("id,name,category,author,platform,preview_url,tags,created_at,is_hidden")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(24);
      let { data, error } = await query;

      if (error) {
        ({ data, error } = await client
          .from("assets")
          .select("id,name,category,author,platform,preview_url,tags,created_at")
          .order("created_at", { ascending: false })
          .limit(24));
      }
      if (error) throw error;

      const assets = (Array.isArray(data) ? data : [])
        .filter((asset) => !asset.is_hidden && !isNsfw(asset))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);
      renderAssets(assets);
      document.dispatchEvent(new CustomEvent("toolhub-recent-fixed", { detail: { assets } }));
    } catch (error) {
      console.error("ToolHub recientes v2:", error);
      renderStatus("No se pudieron cargar los Assets recientes. Puedes seguir entrando al almacén con normalidad.");
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  if (originalRefresh) {
    const replacement = originalRefresh.cloneNode(true);
    originalRefresh.replaceWith(replacement);
    refreshButton = replacement;
    replacement.addEventListener("click", loadRecent);
  }

  loadRecent();
})();