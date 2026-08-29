(() => {
  "use strict";

  if (window.__TOOLHUB_RECENT_DEEPLINK__) return;
  window.__TOOLHUB_RECENT_DEEPLINK__ = true;

  const rail = document.querySelector(".toolhub-recent-rail");
  const list = rail?.querySelector(".toolhub-recent-list");
  const allLink = rail?.querySelector(".toolhub-recent-all");
  if (!rail || !list) return;

  if (allLink) allLink.href = "biblioteca-assets.html";

  const style = document.createElement("style");
  style.id = "toolhubRecentDeepLinkStyles";
  style.textContent = `
    .toolhub-recent-title-link {
      text-decoration:none;
      cursor:pointer;
      transition:color .16s ease, text-decoration-color .16s ease;
    }
    .toolhub-recent-title-link:hover {
      color:#79b8ff;
      text-decoration:underline;
      text-underline-offset:3px;
    }
    .toolhub-recent-title-link:focus-visible {
      outline:2px solid #79b8ff;
      outline-offset:3px;
      border-radius:4px;
    }
  `;
  document.head.appendChild(style);

  let assets = [];
  let applying = false;

  function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
    if (typeof value === "string") return value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    return [];
  }

  function isNsfw(asset) {
    return normalizeTags(asset?.tags).includes("nsfw");
  }

  function enhanceTitles() {
    if (applying || !assets.length) return;
    applying = true;
    try {
      const items = [...list.querySelectorAll(".toolhub-recent-item")];
      items.forEach((item, index) => {
        const asset = assets[index];
        if (!asset?.id) return;

        item.dataset.assetId = String(asset.id);
        const current = item.querySelector(".toolhub-recent-title");
        if (!current) return;

        const href = `biblioteca-assets.html?asset=${encodeURIComponent(String(asset.id))}`;
        if (current.tagName === "A") {
          current.href = href;
          current.classList.add("toolhub-recent-title-link");
          current.title = "Ver únicamente este asset en el almacén";
          return;
        }

        const link = document.createElement("a");
        link.className = `${current.className} toolhub-recent-title-link`;
        link.href = href;
        link.textContent = current.textContent || asset.name || "Asset sin nombre";
        link.title = "Ver únicamente este asset en el almacén";
        current.replaceWith(link);
      });
    } finally {
      applying = false;
    }
  }

  async function getClient() {
    if (window.ToolHubAccount?.ready) await window.ToolHubAccount.ready();
    if (window.ToolHubAccount?.getClient) return window.ToolHubAccount.getClient();

    const cfg = window.TOOLHUB_SUPABASE || {};
    if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) {
      throw new Error("Supabase no está disponible.");
    }

    return window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }

  async function loadAssets() {
    try {
      const client = await getClient();
      let { data, error } = await client
        .from("assets")
        .select("id,name,category,author,platform,tags,created_at,is_hidden")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        ({ data, error } = await client
          .from("assets")
          .select("id,name,category,author,platform,tags,created_at")
          .order("created_at", { ascending: false })
          .limit(100));
      }
      if (error) throw error;

      assets = (Array.isArray(data) ? data : [])
        .filter((asset) => !asset.is_hidden && !isNsfw(asset))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      enhanceTitles();
    } catch (error) {
      console.error("ToolHub deep-link de recientes:", error);
    }
  }

  document.addEventListener("toolhub-recent-fixed", (event) => {
    const incoming = Array.isArray(event.detail?.assets) ? event.detail.assets : [];
    if (incoming.length) {
      const byId = new Map(assets.map((asset) => [String(asset.id), asset]));
      incoming.forEach((asset) => {
        if (asset?.id) byId.set(String(asset.id), asset);
      });
      if (!assets.length) assets = incoming.slice();
      enhanceTitles();
    }
  });

  const observer = new MutationObserver(() => enhanceTitles());
  observer.observe(list, { childList: true });

  loadAssets();
})();
