(() => {
  "use strict";

  if (window.__TOOLHUB_ASSET_PUBLISHER__) return;
  window.__TOOLHUB_ASSET_PUBLISHER__ = true;

  const grid = document.getElementById("assetGrid");
  if (!grid) return;

  const style = document.createElement("style");
  style.id = "toolhubAssetPublisherStyles";
  style.textContent = `
    .asset-publisher {
      display:flex;
      align-items:center;
      gap:5px;
      margin:5px 0 0;
      color:var(--muted);
      font-size:.76rem;
      line-height:1.35;
    }
    .asset-publisher strong {
      color:#9bc9ff;
      font-weight:800;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      max-width:210px;
    }
    .asset-publisher-dot {
      width:5px;
      height:5px;
      flex:0 0 auto;
      border-radius:50%;
      background:#79b8ff;
      box-shadow:0 0 7px rgba(121,184,255,.45);
    }
  `;
  document.head.appendChild(style);

  const assetSubmitters = new Map();
  const profileNames = new Map();
  let clientPromise = null;
  let scheduled = false;
  let running = false;
  let rerun = false;

  async function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      if (window.ToolHubAccount?.ready) {
        try { await window.ToolHubAccount.ready(); } catch (_) {}
      }
      if (window.ToolHubAccount?.getClient) return window.ToolHubAccount.getClient();

      const cfg = window.TOOLHUB_SUPABASE || {};
      if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) {
        throw new Error("Supabase no está disponible para resolver publicadores.");
      }
      return window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    })();
    return clientPromise;
  }

  function chunks(items, size = 80) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
  }

  async function resolveAssets(client, ids) {
    const missing = [...new Set(ids.filter((id) => id && !assetSubmitters.has(id)))];
    for (const batch of chunks(missing)) {
      const { data, error } = await client
        .from("assets")
        .select("id,submitted_by")
        .in("id", batch);
      if (error) {
        console.error("ToolHub publicadores: no se pudo leer submitted_by", error);
        continue;
      }
      (Array.isArray(data) ? data : []).forEach((row) => {
        assetSubmitters.set(String(row.id), row.submitted_by ? String(row.submitted_by) : null);
      });
      batch.forEach((id) => {
        if (!assetSubmitters.has(id)) assetSubmitters.set(id, null);
      });
    }
  }

  async function resolveProfiles(client, userIds) {
    const missing = [...new Set(userIds.filter((id) => id && !profileNames.has(id)))];
    for (const batch of chunks(missing)) {
      const { data, error } = await client
        .from("toolhub_profiles")
        .select("user_id,username,display_name")
        .in("user_id", batch);
      if (error) {
        console.error("ToolHub publicadores: no se pudieron leer perfiles", error);
        continue;
      }
      (Array.isArray(data) ? data : []).forEach((profile) => {
        const name = String(profile.display_name || profile.username || "").trim();
        profileNames.set(String(profile.user_id), name || "Usuario ToolHub");
      });
      batch.forEach((id) => {
        if (!profileNames.has(id)) profileNames.set(id, "Usuario ToolHub");
      });
    }
  }

  function addPublisher(card, name) {
    let line = card.querySelector(".asset-publisher");
    if (!line) {
      line = document.createElement("p");
      line.className = "asset-publisher";
      line.title = "Usuario de ToolHub que publicó esta ficha";

      const dot = document.createElement("span");
      dot.className = "asset-publisher-dot";
      dot.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = "Publicado por:";

      const value = document.createElement("strong");
      value.className = "asset-publisher-name";

      line.append(dot, label, value);
      const author = card.querySelector(".asset-author");
      if (author) author.insertAdjacentElement("afterend", line);
      else card.querySelector(".asset-card-body")?.prepend(line);
    }
    const value = line.querySelector(".asset-publisher-name");
    if (value) value.textContent = name || "Invitado";
  }

  async function decorate() {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      const cards = [...grid.querySelectorAll(".asset-card[data-asset-id]")];
      if (!cards.length) return;

      const client = await getClient();
      const ids = cards.map((card) => String(card.dataset.assetId || "")).filter(Boolean);
      await resolveAssets(client, ids);

      const userIds = ids
        .map((id) => assetSubmitters.get(id))
        .filter(Boolean);
      await resolveProfiles(client, userIds);

      cards.forEach((card) => {
        const id = String(card.dataset.assetId || "");
        const userId = assetSubmitters.get(id);
        const name = userId ? profileNames.get(userId) || "Usuario ToolHub" : "Invitado";
        addPublisher(card, name);
      });
    } catch (error) {
      console.error("ToolHub publicadores:", error);
    } finally {
      running = false;
      if (rerun) {
        rerun = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorate();
    });
  }

  document.addEventListener("toolhub-assets-rendered", (event) => {
    const assets = Array.isArray(event.detail?.assets) ? event.detail.assets : [];
    assets.forEach((asset) => {
      if (!asset?.id) return;
      assetSubmitters.set(String(asset.id), asset.submitted_by ? String(asset.submitted_by) : null);
    });
    schedule();
  });

  const observer = new MutationObserver(schedule);
  observer.observe(grid, { childList: true });

  schedule();
})();
