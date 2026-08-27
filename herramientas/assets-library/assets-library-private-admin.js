(() => {
  "use strict";

  if (window.__TOOLHUB_PRIVATE_ADMIN_UI__) return;
  window.__TOOLHUB_PRIVATE_ADMIN_UI__ = true;

  const PRIVATE_ROLES = new Set(["owner", "admin"]);
  const FIELDS = "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at,updated_at";
  const $ = (selector, root = document) => root.querySelector(selector);

  const style = document.createElement("style");
  style.id = "toolhubPrivateAdminUiStyles";
  style.textContent = `
    .private-admin-status-card{
      display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;
      padding:18px;border:1px solid rgba(255,82,97,.25);border-radius:14px;
      background:linear-gradient(145deg,rgba(86,13,24,.19),rgba(13,20,33,.72));
    }
    .private-admin-status-card strong{display:block;margin-bottom:5px;color:#fff;font-size:1rem}
    .private-admin-status-card p{margin:0;color:var(--muted);font-size:.82rem;line-height:1.55}
    .private-admin-role{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 11px;
      border:1px solid rgba(255,82,97,.3);border-radius:999px;background:rgba(255,82,97,.08);color:#ff7f8a;font-weight:900;font-size:.72rem}
    .private-admin-tools{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
    .private-admin-warning{margin-top:14px;padding:12px 14px;border-left:3px solid #ff5261;border-radius:8px;
      background:rgba(255,82,97,.07);color:#ffc5ca;font-size:.79rem;line-height:1.55}
    .private-card-admin-badge{display:inline-flex;align-items:center;gap:5px;margin-bottom:10px;padding:5px 8px;
      border:1px solid rgba(255,82,97,.22);border-radius:999px;background:rgba(255,82,97,.055);color:#ff828c;font-size:.64rem;font-weight:900}
    .private-edit{border:1px solid rgba(81,148,255,.3)!important;background:rgba(51,148,255,.07)!important;color:#9bc9ff!important}
    .private-edit:hover{border-color:rgba(81,148,255,.55)!important}
    .private-admin-editing{outline:2px solid rgba(51,148,255,.38);outline-offset:3px}
    @media(max-width:680px){.private-admin-status-card{grid-template-columns:1fr}.private-admin-role{justify-self:start}}
  `;
  document.head.appendChild(style);

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    return [...new Set(source.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  }

  function isRlsError(error) {
    const text = String(error?.message || error || "").toLowerCase();
    return text.includes("row-level security") || text.includes("rls") || text.includes("permission denied") || text.includes("policy");
  }

  function showGlobalWriteError(error) {
    const sync = $("#privateSyncStatus");
    if (sync) {
      sync.textContent = isRlsError(error)
        ? "Owner detectado, pero Supabase está bloqueando la escritura RLS"
        : `Error de administración: ${error?.message || error}`;
      sync.className = "private-sync error";
    }

    const warning = $("#privateAdminWarning");
    if (warning) {
      warning.hidden = false;
      warning.textContent = isRlsError(error)
        ? "La cuenta está reconocida como Owner/Admin, pero las políticas de Supabase no permiten INSERT/UPDATE/DELETE. Hay que reaplicar la migración privada de RLS; no es un problema del botón de la web."
        : `Supabase devolvió: ${error?.message || error}`;
    }
  }

  async function boot() {
    const config = window.TOOLHUB_SUPABASE;
    const supabaseApi = window.supabase;
    if (!config?.url || !config?.publishableKey || !supabaseApi?.createClient) return;

    let shell = $("#privateLibraryShell");
    for (let i = 0; i < 60 && (!shell || shell.hidden); i++) {
      await wait(100);
      shell = $("#privateLibraryShell");
    }
    if (!shell || shell.hidden) return;

    const db = supabaseApi.createClient(config.url, config.publishableKey);
    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data: roleData, error: roleError } = await db
      .from("toolhub_admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleError || !PRIVATE_ROLES.has(roleData?.role)) return;

    const role = roleData.role;
    const nav = $(".private-nav");
    const deck = $(".private-panel-deck");
    if (!nav || !deck) return;

    const adminButton = document.createElement("button");
    adminButton.type = "button";
    adminButton.id = "privateAdminPanelButton";
    adminButton.textContent = "Administrar";
    adminButton.dataset.privateAdminPanel = "1";
    nav.insertBefore(adminButton, $("#privateLogoutButton"));

    const panel = document.createElement("article");
    panel.className = "private-panel";
    panel.id = "private-panel-admin";
    panel.innerHTML = `
      <div class="private-panel-head">
        <div>
          <span class="private-panel-kicker">ADMINISTRACIÓN</span>
          <h2>Control del almacén privado</h2>
        </div>
        <span class="private-badge">OWNER / ADMIN</span>
      </div>
      <div class="private-admin-status-card">
        <div>
          <strong>Sesión administrativa activa</strong>
          <p>Desde aquí puedes crear, editar y eliminar fichas del almacén privado. Estas acciones siguen protegidas por Supabase RLS.</p>
        </div>
        <span class="private-admin-role">${role === "owner" ? "OWNER" : "ADMIN"}</span>
      </div>
      <div class="private-admin-tools">
        <button class="private-primary" id="privateAdminNew" type="button">+ Nueva ficha</button>
        <button class="private-secondary" id="privateAdminReload" type="button">Recargar catálogo</button>
      </div>
      <div class="private-admin-warning" id="privateAdminWarning" hidden></div>
    `;
    deck.appendChild(panel);

    function activateAdminPanel() {
      document.querySelectorAll(".private-nav button").forEach((button) => button.classList.remove("active"));
      document.querySelectorAll(".private-panel").forEach((item) => item.classList.remove("active"));
      adminButton.classList.add("active");
      panel.classList.add("active");
    }

    adminButton.addEventListener("click", activateAdminPanel);
    $("#privateAdminNew")?.addEventListener("click", () => {
      document.querySelector('[data-private-panel="create"]')?.click();
      $("#privateAssetName")?.focus();
    });
    $("#privateAdminReload")?.addEventListener("click", () => location.reload());

    let editingId = null;
    let currentAssets = [];

    async function refreshAssets() {
      const { data, error } = await db
        .from("toolhub_private_assets")
        .select(FIELDS)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        showGlobalWriteError(error);
        return [];
      }
      currentAssets = Array.isArray(data) ? data : [];
      return currentAssets;
    }

    function fillForm(asset) {
      editingId = asset.id;
      $("#privateAssetName").value = asset.name || "";
      $("#privateAssetCategory").value = asset.category || "Otro";
      $("#privateAssetAuthor").value = asset.author || "";
      $("#privateAssetPlatform").value = asset.platform || "No especificado";
      $("#privateAssetAuthorUrl").value = asset.author_url || "";
      $("#privateAssetPreview").value = asset.preview_url || "";
      $("#privateAssetDownloadUrl").value = asset.download_url || "";
      $("#privateAssetTags").value = normalizeTags(asset.tags).join(", ");
      $("#privateAssetDescription").value = asset.description || "";
      const publish = $("#privateAssetPublishButton");
      if (publish) publish.textContent = "Guardar cambios";
      const form = $("#privateAssetForm");
      form?.classList.add("private-admin-editing");
      document.querySelector('[data-private-panel="create"]')?.click();
      form?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function enhanceCards() {
      if (!currentAssets.length) await refreshAssets();
      const cards = [...document.querySelectorAll(".private-card")];
      cards.forEach((card) => {
        if (card.dataset.adminEnhanced === "1") return;
        const title = $(".private-title", card)?.textContent?.trim();
        const createdText = $(".private-created", card)?.textContent?.trim();
        const asset = currentAssets.find((item) => {
          if ((item.name || "Sin nombre") !== title) return false;
          const date = new Date(item.created_at || "");
          const dateText = Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-ES");
          return dateText === createdText;
        }) || currentAssets.find((item) => (item.name || "Sin nombre") === title);
        if (!asset) return;

        card.dataset.adminEnhanced = "1";
        card.dataset.privateAssetId = asset.id;
        const body = $(".private-card-body", card);
        const actions = $(".private-card-actions", card);
        if (body && !$(".private-card-admin-badge", card)) {
          const badge = document.createElement("div");
          badge.className = "private-card-admin-badge";
          badge.textContent = "⚙ ADMINISTRABLE";
          body.insertBefore(badge, body.firstChild);
        }
        if (actions && !$(".private-edit", card)) {
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "private-secondary private-edit";
          edit.textContent = "Editar";
          edit.addEventListener("click", () => fillForm(asset));
          const del = $(".private-delete", card);
          actions.insertBefore(edit, del || null);
        }
      });
    }

    await refreshAssets();
    await enhanceCards();

    const grid = $("#privateAssetGrid");
    const gridObserver = new MutationObserver(async () => {
      await refreshAssets();
      await enhanceCards();
    });
    if (grid) gridObserver.observe(grid, { childList: true });

    const form = $("#privateAssetForm");
    if (form) {
      form.addEventListener("reset", () => {
        editingId = null;
        const publish = $("#privateAssetPublishButton");
        if (publish) publish.textContent = "Guardar en privado";
        form.classList.remove("private-admin-editing");
      });

      form.addEventListener("submit", async (event) => {
        if (!editingId) return;
        event.preventDefault();
        event.stopImmediatePropagation();

        const payload = {
          name: $("#privateAssetName").value.trim(),
          category: $("#privateAssetCategory").value,
          author: $("#privateAssetAuthor").value.trim(),
          platform: $("#privateAssetPlatform").value || "No especificado",
          author_url: safeUrl($("#privateAssetAuthorUrl").value),
          preview_url: safeUrl($("#privateAssetPreview").value),
          download_url: safeUrl($("#privateAssetDownloadUrl").value),
          tags: normalizeTags($("#privateAssetTags").value),
          description: $("#privateAssetDescription").value.trim()
        };

        if (!payload.name || !payload.category) return;
        const publish = $("#privateAssetPublishButton");
        if (publish) publish.disabled = true;
        const sync = $("#privateSyncStatus");
        if (sync) sync.textContent = "Guardando cambios…";

        const { error } = await db.from("toolhub_private_assets").update(payload).eq("id", editingId);
        if (publish) publish.disabled = false;
        if (error) {
          showGlobalWriteError(error);
          return;
        }

        editingId = null;
        form.reset();
        if (sync) {
          sync.textContent = "✓ Cambios guardados";
          sync.className = "private-sync ok";
        }
        setTimeout(() => location.reload(), 350);
      }, true);
    }

    const sync = $("#privateSyncStatus");
    if (sync) {
      const syncObserver = new MutationObserver(() => {
        const text = sync.textContent || "";
        if (/no se pudo guardar|row-level security|permission denied|policy/i.test(text)) {
          showGlobalWriteError(new Error(text));
        }
      });
      syncObserver.observe(sync, { childList: true, subtree: true, characterData: true });
    }
  }

  boot().catch((error) => console.error("ToolHub private admin UI:", error));
})();
