(() => {
  "use strict";

  if (window.__TOOLHUB_RECENT_FILL__) return;
  window.__TOOLHUB_RECENT_FILL__ = true;

  const rail = document.querySelector(".toolhub-recent-rail");
  const head = rail?.querySelector(".toolhub-recent-head");
  const body = rail?.querySelector(".toolhub-recent-body");
  const list = rail?.querySelector(".toolhub-recent-list");
  const actions = rail?.querySelector(".toolhub-recent-actions");
  const allLink = rail?.querySelector(".toolhub-recent-all");
  const refreshButton = rail?.querySelector(".toolhub-recent-refresh");

  if (!rail || !head || !body || !list || !actions || !allLink) return;

  allLink.href = "https://sinnombre-vr.github.io/ToolHub.github.io/biblioteca-assets.html";
  allLink.textContent = "Ver todos los Assets →";
  if (refreshButton) refreshButton.remove();

  const style = document.createElement("style");
  style.id = "toolhubRecentFillStyles";
  style.textContent = `
    @media (min-width: 1321px) {
      main.toolhub-home-with-recent > .toolhub-recent-rail {
        display:flex !important;
        flex-direction:column !important;
      }

      main.toolhub-home-with-recent > .toolhub-recent-rail .toolhub-recent-body {
        flex:1 1 auto;
        min-height:0;
        display:flex;
      }

      main.toolhub-home-with-recent > .toolhub-recent-rail .toolhub-recent-list {
        flex:1 1 auto;
        min-height:0;
        width:100%;
        display:flex;
        flex-direction:column;
      }

      main.toolhub-home-with-recent > .toolhub-recent-rail .toolhub-recent-item {
        flex:1 1 104px;
        min-height:96px;
        max-height:124px;
      }

      main.toolhub-home-with-recent > .toolhub-recent-rail .toolhub-recent-actions {
        flex:0 0 auto;
        margin-top:auto;
        justify-content:flex-start;
      }
    }

    .toolhub-recent-actions .toolhub-recent-all {
      display:inline-flex;
      align-items:center;
      min-height:30px;
    }
  `;
  document.head.appendChild(style);

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
    return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() <= 86400000;
  }

  function getDesktopCapacity() {
    if (!window.matchMedia("(min-width: 1321px)").matches) return Infinity;

    const available = Math.max(0, rail.clientHeight - head.offsetHeight - actions.offsetHeight);
    if (!available) return 5;

    // Mantiene las fichas legibles y aprovecha toda la altura disponible.
    return Math.max(5, Math.floor(available / 100));
  }

  function makeFallback(container) {
    const fallback = document.createElement("span");
    fallback.className = "toolhub-recent-preview-fallback";
    fallback.textContent = "⬡";
    container.appendChild(fallback);
  }

  function renderAsset(asset) {
    const item = document.createElement("article");
    item.className = "toolhub-recent-item";

    const content = document.createElement("div");
    content.className = "toolhub-recent-content";

    const title = document.createElement("h3");
    title.className = "toolhub-recent-title";
    title.textContent = asset.name || "Asset sin nombre";

    const meta = document.createElement("div");
    meta.className = "toolhub-recent-meta";

    const category = document.createElement("span");
    category.className = "toolhub-recent-category";
    category.textContent = asset.category || "Asset";

    const author = document.createElement("span");
    author.className = "toolhub-recent-author";
    author.textContent = asset.author || asset.platform || "ToolHub";

    const ago = document.createElement("span");
    ago.textContent = timeAgo(asset.created_at);

    [category, author, ago].forEach((node, index) => {
      if (index) {
        const sep = document.createElement("span");
        sep.className = "toolhub-recent-separator";
        sep.textContent = "•";
        meta.appendChild(sep);
      }
      meta.appendChild(node);
    });

    content.append(title, meta);

    const previewWrap = document.createElement("div");
    previewWrap.className = "toolhub-recent-preview-wrap";

    const preview = safeUrl(asset.preview_url);
    if (preview) {
      const image = document.createElement("img");
      image.className = "toolhub-recent-preview";
      image.src = preview;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        image.remove();
        if (!previewWrap.querySelector(".toolhub-recent-preview-fallback")) makeFallback(previewWrap);
      }, { once: true });
      previewWrap.appendChild(image);
    } else {
      makeFallback(previewWrap);
    }

    if (isNew(asset.created_at)) {
      const badge = document.createElement("span");
      badge.className = "toolhub-recent-new";
      badge.textContent = "NUEVO";
      previewWrap.appendChild(badge);
    }

    item.append(content, previewWrap);
    return item;
  }

  function render(assets) {
    const capacity = getDesktopCapacity();
    const visible = Number.isFinite(capacity) ? assets.slice(0, capacity) : assets;

    list.replaceChildren();
    visible.forEach((asset) => list.appendChild(renderAsset(asset)));

    if (!visible.length) {
      const status = document.createElement("div");
      status.className = "toolhub-recent-status";
      status.textContent = "Todavía no hay incorporaciones públicas para mostrar.";
      list.appendChild(status);
    }
  }

  async function loadConfig() {
    if (window.TOOLHUB_SUPABASE?.url && window.TOOLHUB_SUPABASE?.publishableKey) {
      return window.TOOLHUB_SUPABASE;
    }

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-toolhub-recent-supabase-config]');
      if (existing) {
        if (window.TOOLHUB_SUPABASE) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "herramientas/assets-library/supabase-config.js?v=2";
      script.dataset.toolhubRecentSupabaseConfig = "1";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });

    return window.TOOLHUB_SUPABASE || {};
  }

  async function requestAssets(config, withHidden = true) {
    const fields = withHidden
      ? "id,name,category,author,platform,preview_url,tags,created_at,is_hidden"
      : "id,name,category,author,platform,preview_url,tags,created_at";

    const params = new URLSearchParams({
      select: fields,
      order: "created_at.desc",
      limit: "100"
    });
    if (withHidden) params.set("is_hidden", "eq.false");

    const response = await fetch(`${config.url}/rest/v1/assets?${params.toString()}`, {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  let cachedAssets = [];

  async function loadAllRecent() {
    try {
      const config = await loadConfig();
      if (!config.url || !config.publishableKey) return;

      let assets;
      try {
        assets = await requestAssets(config, true);
      } catch (_) {
        assets = await requestAssets(config, false);
      }

      cachedAssets = assets
        .filter((asset) => !isNsfw(asset))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      render(cachedAssets);
    } catch (error) {
      console.error("ToolHub recientes extendidos:", error);
    }
  }

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (cachedAssets.length) render(cachedAssets);
    });
  }, { passive: true });

  requestAnimationFrame(() => requestAnimationFrame(loadAllRecent));
})();