(() => {
  "use strict";

  if (window.__TOOLHUB_RECENT_ASSETS__) return;
  window.__TOOLHUB_RECENT_ASSETS__ = true;

  const main = document.querySelector("main");
  const hero = document.querySelector("#inicio");
  if (!main || !hero || !document.querySelector("#asset-library")) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const state = { assets: [], loading: true, error: false };

  const style = document.createElement("style");
  style.id = "toolhubRecentAssetsStyles";
  style.textContent = `
    main.toolhub-home-with-recent {
      width:min(1500px, calc(100% - 40px));
      display:grid;
      grid-template-columns:minmax(0, 1fr) 306px;
      gap:26px;
      align-items:start;
    }

    .toolhub-home-flow {
      min-width:0;
      width:100%;
    }

    .toolhub-recent-rail {
      position:sticky;
      top:100px;
      margin-top:86px;
      min-width:0;
      border:1px solid rgba(75,132,204,.17);
      border-radius:17px;
      background:
        radial-gradient(circle at 100% 0%, rgba(50,143,255,.08), transparent 36%),
        linear-gradient(180deg, rgba(10,16,27,.96), rgba(7,12,21,.96));
      box-shadow:0 22px 55px rgba(0,0,0,.22);
      overflow:hidden;
    }

    .toolhub-recent-head {
      padding:18px 18px 14px;
      border-bottom:1px solid rgba(81,130,191,.13);
    }

    .toolhub-recent-kicker {
      display:flex;
      align-items:center;
      gap:7px;
      margin-bottom:6px;
      color:var(--blue);
      font-size:.66rem;
      font-weight:850;
      letter-spacing:.1em;
      text-transform:uppercase;
    }

    .toolhub-recent-live-dot {
      width:7px;
      height:7px;
      border-radius:50%;
      background:#38d996;
      box-shadow:0 0 10px rgba(56,217,150,.6);
    }

    .toolhub-recent-head h2 {
      margin:0;
      font-size:1.08rem;
      letter-spacing:-.025em;
    }

    .toolhub-recent-head p {
      margin:5px 0 0;
      color:var(--muted);
      font-size:.73rem;
      line-height:1.45;
    }

    .toolhub-recent-list {
      padding:0 17px;
    }

    .toolhub-recent-item {
      position:relative;
      display:grid;
      grid-template-columns:minmax(0,1fr) 64px;
      gap:12px;
      min-height:104px;
      padding:15px 0;
      border-bottom:1px solid rgba(134,157,188,.22);
    }

    .toolhub-recent-item:last-child {
      border-bottom:0;
    }

    .toolhub-recent-content {
      min-width:0;
      display:flex;
      flex-direction:column;
      justify-content:center;
    }

    .toolhub-recent-title {
      margin:0;
      color:var(--text);
      font-size:.78rem;
      line-height:1.4;
      font-weight:760;
      display:-webkit-box;
      -webkit-box-orient:vertical;
      -webkit-line-clamp:2;
      overflow:hidden;
    }

    .toolhub-recent-meta {
      display:flex;
      align-items:center;
      gap:6px;
      flex-wrap:wrap;
      margin-top:8px;
      color:var(--muted);
      font-size:.66rem;
      line-height:1.35;
    }

    .toolhub-recent-category {
      color:#79b8ff;
      font-weight:760;
    }

    .toolhub-recent-separator {
      opacity:.45;
    }

    .toolhub-recent-author {
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      max-width:118px;
    }

    .toolhub-recent-preview-wrap {
      position:relative;
      width:64px;
      height:64px;
      align-self:center;
      border-radius:10px;
      overflow:hidden;
      border:1px solid rgba(83,139,208,.2);
      background:linear-gradient(145deg, rgba(25,42,65,.9), rgba(10,18,30,.95));
    }

    .toolhub-recent-preview {
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .toolhub-recent-preview-fallback {
      width:100%;
      height:100%;
      display:grid;
      place-items:center;
      color:var(--blue);
      font-size:1.25rem;
    }

    .toolhub-recent-new {
      position:absolute;
      top:5px;
      right:5px;
      min-height:17px;
      padding:1px 5px;
      border-radius:999px;
      border:1px solid rgba(56,217,150,.28);
      background:rgba(5,18,16,.86);
      color:#68e9b1;
      font-size:.52rem;
      font-weight:850;
      letter-spacing:.04em;
    }

    .toolhub-recent-actions {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:13px 17px 15px;
      border-top:1px solid rgba(81,130,191,.13);
      background:rgba(8,14,24,.55);
    }

    .toolhub-recent-all,
    .toolhub-recent-refresh {
      border:0;
      background:transparent;
      color:var(--muted);
      font:inherit;
      font-size:.7rem;
      font-weight:760;
      cursor:pointer;
      padding:4px 0;
    }

    .toolhub-recent-all {
      color:#79b8ff;
    }

    .toolhub-recent-all:hover,
    .toolhub-recent-refresh:hover {
      color:var(--text);
    }

    .toolhub-recent-status {
      padding:20px 17px;
      color:var(--muted);
      font-size:.73rem;
      line-height:1.45;
    }

    .toolhub-recent-skeleton {
      height:96px;
      margin:0 17px;
      border-bottom:1px solid rgba(134,157,188,.17);
      position:relative;
      overflow:hidden;
    }

    .toolhub-recent-skeleton::after {
      content:"";
      position:absolute;
      inset:16px 0;
      border-radius:10px;
      background:linear-gradient(90deg, rgba(25,37,55,.52), rgba(41,58,81,.72), rgba(25,37,55,.52));
      background-size:220% 100%;
      animation:toolhub-recent-shimmer 1.35s linear infinite;
    }

    @keyframes toolhub-recent-shimmer {
      from { background-position:200% 0; }
      to { background-position:-20% 0; }
    }

    @media (max-width:1320px) {
      main.toolhub-home-with-recent {
        display:grid;
        grid-template-columns:1fr;
        width:min(1180px, calc(100% - 40px));
      }

      .toolhub-home-flow {
        display:contents;
      }

      .toolhub-home-flow > * {
        order:4;
      }

      .toolhub-home-flow > #inicio {
        order:1;
      }

      .toolhub-home-flow > .quick-access {
        order:2;
      }

      .toolhub-recent-rail {
        order:3;
        position:relative;
        top:auto;
        margin-top:18px;
      }

      .toolhub-recent-list {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:0 22px;
      }

      .toolhub-recent-item:nth-child(odd) {
        border-right:1px solid rgba(134,157,188,.16);
        padding-right:22px;
      }

      .toolhub-recent-item:nth-child(even) {
        padding-left:0;
      }
    }

    @media (max-width:720px) {
      main.toolhub-home-with-recent {
        width:min(100% - 28px, 1180px);
        gap:0;
      }

      .toolhub-recent-rail {
        margin-top:8px;
      }

      .toolhub-recent-list {
        grid-template-columns:1fr;
      }

      .toolhub-recent-item:nth-child(odd) {
        border-right:0;
        padding-right:0;
      }

      .toolhub-recent-head {
        padding:16px 15px 13px;
      }

      .toolhub-recent-list,
      .toolhub-recent-actions {
        padding-left:15px;
        padding-right:15px;
      }
    }
  `;
  document.head.appendChild(style);

  const flow = document.createElement("div");
  flow.className = "toolhub-home-flow";

  while (main.firstChild) flow.appendChild(main.firstChild);
  main.appendChild(flow);
  main.classList.add("toolhub-home-with-recent");

  const rail = document.createElement("aside");
  rail.className = "toolhub-recent-rail";
  rail.setAttribute("aria-labelledby", "toolhubRecentTitle");
  rail.innerHTML = `
    <div class="toolhub-recent-head">
      <span class="toolhub-recent-kicker"><span class="toolhub-recent-live-dot"></span>ACTUALIZADO AUTOMÁTICAMENTE</span>
      <h2 id="toolhubRecentTitle">Recién subido</h2>
      <p>Las últimas incorporaciones públicas al almacén de Assets.</p>
    </div>
    <div class="toolhub-recent-body">
      <div class="toolhub-recent-list" aria-live="polite"></div>
    </div>
    <div class="toolhub-recent-actions">
      <a class="toolhub-recent-all" href="biblioteca-assets.html">Ver todos los Assets →</a>
      <button class="toolhub-recent-refresh" type="button" aria-label="Actualizar recientes">↻ Actualizar</button>
    </div>
  `;
  main.appendChild(rail);

  const list = $(".toolhub-recent-list", rail);
  const refreshButton = $(".toolhub-recent-refresh", rail);

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

  function renderLoading() {
    list.replaceChildren();
    for (let i = 0; i < 5; i += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "toolhub-recent-skeleton";
      list.appendChild(skeleton);
    }
  }

  function renderStatus(text) {
    list.replaceChildren();
    const status = document.createElement("div");
    status.className = "toolhub-recent-status";
    status.textContent = text;
    list.appendChild(status);
  }

  function render() {
    if (state.loading) {
      renderLoading();
      return;
    }

    if (state.error) {
      renderStatus("No se pudieron cargar los Assets recientes. Puedes seguir entrando al almacén con normalidad.");
      return;
    }

    if (!state.assets.length) {
      renderStatus("Todavía no hay incorporaciones públicas para mostrar.");
      return;
    }

    list.replaceChildren();

    state.assets.slice(0, 5).forEach((asset) => {
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

      const separatorOne = document.createElement("span");
      separatorOne.className = "toolhub-recent-separator";
      separatorOne.textContent = "•";

      const author = document.createElement("span");
      author.className = "toolhub-recent-author";
      author.textContent = asset.author || asset.platform || "ToolHub";

      const separatorTwo = document.createElement("span");
      separatorTwo.className = "toolhub-recent-separator";
      separatorTwo.textContent = "•";

      const ago = document.createElement("span");
      ago.textContent = timeAgo(asset.created_at);

      meta.append(category, separatorOne, author, separatorTwo, ago);
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

  function loadConfig() {
    if (window.TOOLHUB_SUPABASE?.url && window.TOOLHUB_SUPABASE?.publishableKey) {
      return Promise.resolve(window.TOOLHUB_SUPABASE);
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-toolhub-recent-supabase-config]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.TOOLHUB_SUPABASE || {}), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "herramientas/assets-library/supabase-config.js?v=2";
      script.defer = true;
      script.dataset.toolhubRecentSupabaseConfig = "1";
      script.addEventListener("load", () => resolve(window.TOOLHUB_SUPABASE || {}), { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function requestAssets(config, includeHiddenField = true) {
    const fields = includeHiddenField
      ? "id,name,category,author,platform,preview_url,download_url,tags,created_at,is_hidden"
      : "id,name,category,author,platform,preview_url,download_url,tags,created_at";

    const params = new URLSearchParams();
    params.set("select", fields);
    params.set("order", "created_at.desc");
    params.set("limit", "24");
    if (includeHiddenField) params.set("is_hidden", "eq.false");

    const response = await fetch(`${config.url}/rest/v1/assets?${params.toString()}`, {
      method: "GET",
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

  async function loadRecent() {
    state.loading = true;
    state.error = false;
    render();
    refreshButton.disabled = true;

    try {
      const config = await loadConfig();
      if (!config.url || !config.publishableKey) throw new Error("Supabase no configurado");

      let assets;
      try {
        assets = await requestAssets(config, true);
      } catch (_) {
        assets = await requestAssets(config, false);
      }

      state.assets = assets
        .filter((asset) => !isNsfw(asset))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);
    } catch (error) {
      console.error("ToolHub recientes:", error);
      state.assets = [];
      state.error = true;
    } finally {
      state.loading = false;
      refreshButton.disabled = false;
      render();
    }
  }

  refreshButton.addEventListener("click", loadRecent);
  loadRecent();
})();