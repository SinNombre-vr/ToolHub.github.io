(() => {
  "use strict";

  const api = window.ToolHubAssets;
  if (!api) return;

  const selected = new Set();
  const adminData = {
    reports: [],
    activity: [],
    admins: [],
    linkResults: new Map()
  };

  const REASONS = {
    broken_link: "Enlace roto",
    wrong_preview: "Preview incorrecta",
    duplicate: "Duplicado",
    nsfw: "NSFW sin marcar / incorrecto",
    wrong_info: "Información incorrecta",
    other: "Otro"
  };

  const CATEGORIES = ["Avatar", "Ropa", "Pelo", "Accesorio", "Shader", "Textura", "Prefab", "Animación", "Herramienta", "Otro"];
  const PLATFORMS = ["PC", "Quest / Android", "PC + Quest", "No especificado"];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function state() {
    return api.getState();
  }

  function db() {
    return api.getDb();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function canManage() {
    return Boolean(state().adminUnlocked);
  }

  function canDelete() {
    if (!canManage()) return false;
    return !state().schemaV2 || ["owner", "admin"].includes(state().adminRole);
  }

  function canManageAdmins() {
    return canManage() && state().adminRole === "owner";
  }

  function isNsfw(asset) {
    return api.isNsfw(asset);
  }

  function normalizeTags(value) {
    return api.normalizeTags(value);
  }

  function findAsset(id) {
    return api.getAsset(id);
  }

  function createDialog(className, id, inner) {
    let dialog = document.getElementById(id);
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = id;
    dialog.className = className;
    dialog.innerHTML = inner;
    document.body.appendChild(dialog);
    return dialog;
  }

  const reportDialog = createDialog("asset-admin-dialog asset-report-dialog", "assetReportDialog", `
    <form class="asset-admin-card asset-report-card" id="assetReportForm">
      <button class="asset-dialog-close" type="button" data-close-report aria-label="Cerrar">×</button>
      <span class="asset-panel-kicker">REPORTAR</span>
      <h2>Informar de un problema</h2>
      <p class="asset-admin-muted">Ayuda a mantener la biblioteca actualizada. El reporte solo será visible para el equipo de administración.</p>
      <div class="asset-report-target" id="assetReportTarget"></div>
      <label>
        <span>Motivo</span>
        <select id="assetReportReason" required>
          <option value="broken_link">Enlace roto</option>
          <option value="wrong_preview">Preview incorrecta</option>
          <option value="duplicate">Duplicado</option>
          <option value="nsfw">NSFW sin marcar / incorrecto</option>
          <option value="wrong_info">Información incorrecta</option>
          <option value="other">Otro</option>
        </select>
      </label>
      <label>
        <span>Detalles</span>
        <textarea id="assetReportDetails" maxlength="600" rows="4" placeholder="Explica brevemente qué ocurre..."></textarea>
      </label>
      <div class="asset-admin-actions">
        <button class="asset-primary" type="submit">Enviar reporte</button>
        <button class="asset-secondary" type="button" data-close-report>Cancelar</button>
      </div>
      <div class="asset-admin-message" id="assetReportMessage" aria-live="polite"></div>
    </form>
  `);

  const editDialog = createDialog("asset-admin-dialog asset-edit-dialog", "assetEditDialog", `
    <form class="asset-admin-card asset-edit-card" id="assetEditForm">
      <button class="asset-dialog-close" type="button" data-close-edit aria-label="Cerrar">×</button>
      <span class="asset-panel-kicker">EDITAR FICHA</span>
      <h2 id="assetEditTitle">Editar asset</h2>
      <div class="asset-admin-form-grid">
        <label><span>Nombre</span><input id="editName" maxlength="90" required></label>
        <label><span>Categoría</span><select id="editCategory">${CATEGORIES.map((x) => `<option>${x}</option>`).join("")}</select></label>
        <label><span>Autor</span><input id="editAuthor" maxlength="70"></label>
        <label><span>Compatibilidad</span><select id="editPlatform">${PLATFORMS.map((x) => `<option>${x}</option>`).join("")}</select></label>
        <label class="asset-admin-wide"><span>Autor / origen</span><input id="editAuthorUrl" type="url" required></label>
        <label class="asset-admin-wide"><span>Preview</span><input id="editPreviewUrl" type="url"></label>
        <label class="asset-admin-wide"><span>Descarga</span><input id="editDownloadUrl" type="url" required></label>
        <label class="asset-admin-wide"><span>Tags</span><input id="editTags" placeholder="avatar, ropa, ..."></label>
        <label class="asset-admin-wide"><span>Descripción</span><textarea id="editDescription" maxlength="500" rows="4"></textarea></label>
      </div>
      <div class="asset-edit-switches">
        <label><input id="editNsfw" type="checkbox"><span>🔞 NSFW</span></label>
        <label><input id="editFeatured" type="checkbox"><span>⭐ Destacado</span></label>
        <label><input id="editHidden" type="checkbox"><span>🙈 Oculto</span></label>
      </div>
      <div class="asset-admin-actions">
        <button class="asset-primary" type="submit">Guardar cambios</button>
        <button class="asset-secondary" type="button" data-close-edit>Cancelar</button>
      </div>
      <div class="asset-admin-message" id="assetEditMessage" aria-live="polite"></div>
    </form>
  `);

  let reportAssetId = null;
  let editAssetId = null;

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  $$('[data-close-report]', reportDialog).forEach((button) => button.addEventListener("click", () => closeDialog(reportDialog)));
  $$('[data-close-edit]', editDialog).forEach((button) => button.addEventListener("click", () => closeDialog(editDialog)));

  function openReport(asset) {
    reportAssetId = asset.id;
    $("#assetReportTarget").textContent = asset.name || "Asset";
    $("#assetReportReason").value = "broken_link";
    $("#assetReportDetails").value = "";
    $("#assetReportMessage").textContent = "";
    reportDialog.showModal();
  }

  $("#assetReportForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const client = db();
    const message = $("#assetReportMessage");
    if (!client || !reportAssetId) return;

    const reason = $("#assetReportReason").value;
    const details = $("#assetReportDetails").value.trim();
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    message.textContent = "Enviando…";
    message.className = "asset-admin-message";

    const { error } = await client.from("toolhub_reports").insert({
      asset_id: reportAssetId,
      reason,
      details
    });

    if (submit) submit.disabled = false;
    if (error) {
      message.textContent = error.message.includes("toolhub_reports")
        ? "El sistema de reportes aún no está activado en Supabase."
        : `No se pudo enviar: ${error.message}`;
      message.className = "asset-admin-message error";
      return;
    }

    message.textContent = "✓ Reporte enviado. Gracias.";
    message.className = "asset-admin-message ok";
    setTimeout(() => closeDialog(reportDialog), 650);
  });

  function openEdit(asset) {
    if (!canManage()) return;
    editAssetId = asset.id;
    $("#assetEditTitle").textContent = `Editar · ${asset.name || "Asset"}`;
    $("#editName").value = asset.name || "";
    $("#editCategory").value = CATEGORIES.includes(asset.category) ? asset.category : "Otro";
    $("#editAuthor").value = asset.author || "";
    $("#editPlatform").value = PLATFORMS.includes(asset.platform) ? asset.platform : "No especificado";
    $("#editAuthorUrl").value = asset.author_url || "";
    $("#editPreviewUrl").value = asset.preview_url || "";
    $("#editDownloadUrl").value = asset.download_url || "";
    $("#editTags").value = normalizeTags(asset.tags).filter((x) => x !== "nsfw").join(", ");
    $("#editDescription").value = asset.description || "";
    $("#editNsfw").checked = isNsfw(asset);
    $("#editFeatured").checked = Boolean(asset.is_featured);
    $("#editHidden").checked = Boolean(asset.is_hidden);
    $("#editFeatured").disabled = !state().schemaV2;
    $("#editHidden").disabled = !state().schemaV2;
    $("#assetEditMessage").textContent = "";
    editDialog.showModal();
  }

  $("#assetEditForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const client = db();
    const asset = findAsset(editAssetId);
    const message = $("#assetEditMessage");
    if (!client || !asset || !canManage()) return;

    const authorUrl = api.safeUrl($("#editAuthorUrl").value);
    const downloadUrl = api.safeUrl($("#editDownloadUrl").value);
    const previewRaw = $("#editPreviewUrl").value.trim();
    const previewUrl = previewRaw ? api.safeUrl(previewRaw) : "";
    if (!authorUrl || !downloadUrl || (previewRaw && !previewUrl)) {
      message.textContent = "Revisa los enlaces antes de guardar.";
      message.className = "asset-admin-message error";
      return;
    }

    let tags = normalizeTags($("#editTags").value).filter((x) => x !== "nsfw");
    if ($("#editNsfw").checked) tags.push("nsfw");

    const payload = {
      name: $("#editName").value.trim(),
      category: $("#editCategory").value,
      author: $("#editAuthor").value.trim(),
      platform: $("#editPlatform").value,
      author_url: authorUrl,
      preview_url: previewUrl,
      download_url: downloadUrl,
      tags,
      description: $("#editDescription").value.trim()
    };

    if (state().schemaV2) {
      payload.is_featured = $("#editFeatured").checked;
      payload.is_hidden = $("#editHidden").checked;
    }

    const submit = event.submitter;
    if (submit) submit.disabled = true;
    message.textContent = "Guardando…";
    message.className = "asset-admin-message";

    const fields = state().schemaV2
      ? "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at,is_hidden,is_featured,updated_at"
      : "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at";
    const { data, error } = await client.from("assets").update(payload).eq("id", asset.id).select(fields).single();

    if (submit) submit.disabled = false;
    if (error) {
      message.textContent = `No se pudo guardar: ${error.message}`;
      message.className = "asset-admin-message error";
      return;
    }

    Object.assign(asset, data);
    api.render();
    message.textContent = "✓ Cambios guardados.";
    message.className = "asset-admin-message ok";
    api.setSyncStatus("✅ Ficha actualizada", "ok");
    await refreshAdminData();
    setTimeout(() => closeDialog(editDialog), 500);
  });

  async function updateAsset(asset, changes, successText = "Ficha actualizada") {
    const client = db();
    if (!client || !canManage()) return false;
    const { data, error } = await client.from("assets").update(changes).eq("id", asset.id).select("*").single();
    if (error) {
      alert(`No se pudo actualizar: ${error.message}`);
      return false;
    }
    Object.assign(asset, data);
    api.render();
    api.setSyncStatus(`✅ ${successText}`, "ok");
    refreshAdminData();
    return true;
  }

  async function toggleNsfw(asset) {
    let tags = normalizeTags(asset.tags).filter((tag) => tag !== "nsfw");
    if (!isNsfw(asset)) tags.push("nsfw");
    return updateAsset(asset, { tags }, isNsfw(asset) ? "NSFW retirado" : "Marcado NSFW");
  }

  async function toggleFeatured(asset) {
    if (!state().schemaV2) return alertMigration();
    return updateAsset(asset, { is_featured: !asset.is_featured }, asset.is_featured ? "Destacado retirado" : "Asset destacado");
  }

  async function toggleHidden(asset) {
    if (!state().schemaV2) return alertMigration();
    return updateAsset(asset, { is_hidden: !asset.is_hidden }, asset.is_hidden ? "Asset publicado" : "Asset ocultado");
  }

  function alertMigration() {
    alert("Esta función necesita activar Admin v2 en Supabase. Ejecuta supabase/toolhub-admin-v2.sql desde el SQL Editor.");
    return false;
  }

  function ensureNsfwVisual(card, asset) {
    const previewWrap = $(".asset-preview-wrap", card);
    const image = $(".asset-preview", card);
    const platform = $(".asset-platform-badge", card);
    if (!previewWrap || !image || !platform) return;

    card.classList.toggle("is-nsfw", isNsfw(asset));
    if (!isNsfw(asset)) {
      $(".asset-preview-view-button", card)?.remove();
      $(".asset-nsfw-badge", card)?.remove();
      card.classList.remove("is-nsfw-revealed");
      return;
    }

    let stack = $(".asset-badge-stack", previewWrap);
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "asset-badge-stack";
      previewWrap.appendChild(stack);
      stack.appendChild(platform);
    }

    if (!$(".asset-nsfw-badge", stack)) {
      const badge = document.createElement("span");
      badge.className = "asset-nsfw-badge";
      badge.textContent = "NSFW";
      stack.appendChild(badge);
    }

    if (!$(".asset-preview-view-button", previewWrap) && image.getAttribute("src")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "asset-preview-view-button";
      button.innerHTML = "👁 <span>Ver imagen</span>";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const revealed = card.classList.toggle("is-nsfw-revealed");
        button.innerHTML = revealed ? "🙈 <span>Ocultar imagen</span>" : "👁 <span>Ver imagen</span>";
      });
      previewWrap.appendChild(button);
    }
  }

  function ensureFeaturedHiddenBadges(card, asset) {
    const previewWrap = $(".asset-preview-wrap", card);
    if (!previewWrap) return;

    let topBadges = $(".asset-admin-public-badges", previewWrap);
    if (!topBadges) {
      topBadges = document.createElement("div");
      topBadges.className = "asset-admin-public-badges";
      previewWrap.appendChild(topBadges);
    }
    topBadges.replaceChildren();

    if (asset.is_featured) {
      const badge = document.createElement("span");
      badge.className = "asset-featured-badge";
      badge.textContent = "★ Destacado";
      topBadges.appendChild(badge);
    }
    if (asset.is_hidden && canManage()) {
      const badge = document.createElement("span");
      badge.className = "asset-hidden-badge";
      badge.textContent = "Oculto";
      topBadges.appendChild(badge);
    }
  }

  function ensureReportButton(card, asset) {
    const actions = $(".asset-card-actions", card);
    if (!actions || $(".asset-report-button", actions)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-report-button";
    button.textContent = "⚑ Reportar";
    button.addEventListener("click", () => openReport(asset));
    actions.insertAdjacentElement("afterend", button);
  }

  function renderLinkStatus(container, result) {
    container.replaceChildren();
    if (!result) return;
    [
      ["Origen", result.author],
      ["Preview", result.preview],
      ["Descarga", result.download]
    ].forEach(([label, status]) => {
      const chip = document.createElement("span");
      chip.className = `asset-link-chip ${status}`;
      chip.textContent = `${label}: ${status === "ok" ? "OK" : status === "broken" ? "ERROR" : "?"}`;
      container.appendChild(chip);
    });
  }

  function ensureAdminControls(card, asset) {
    const body = $(".asset-card-body", card);
    if (!body) return;
    let controls = $(".asset-admin-card-controls", card);

    if (!canManage()) {
      controls?.remove();
      return;
    }

    if (!controls) {
      controls = document.createElement("div");
      controls.className = "asset-admin-card-controls";
      controls.innerHTML = `
        <label class="asset-admin-select-label" title="Seleccionar para acciones múltiples">
          <input class="asset-admin-select" type="checkbox">
          <span>Seleccionar</span>
        </label>
        <div class="asset-admin-mini-actions">
          <button type="button" data-admin-action="edit">✏️ Editar</button>
          <button type="button" data-admin-action="hidden"></button>
          <button type="button" data-admin-action="featured"></button>
          <button type="button" data-admin-action="nsfw"></button>
          <button type="button" data-admin-action="links">🔗 Revisar</button>
        </div>
        <div class="asset-link-status"></div>
      `;
      body.insertBefore(controls, $(".asset-card-actions", body));

      const checkbox = $(".asset-admin-select", controls);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selected.add(String(asset.id)) : selected.delete(String(asset.id));
        updateBulkSelectionCount();
      });
      $("[data-admin-action='edit']", controls).addEventListener("click", () => openEdit(asset));
      $("[data-admin-action='hidden']", controls).addEventListener("click", () => toggleHidden(asset));
      $("[data-admin-action='featured']", controls).addEventListener("click", () => toggleFeatured(asset));
      $("[data-admin-action='nsfw']", controls).addEventListener("click", () => toggleNsfw(asset));
      $("[data-admin-action='links']", controls).addEventListener("click", async (event) => {
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = "Revisando…";
        const result = await checkAssetLinks(asset);
        adminData.linkResults.set(String(asset.id), result);
        renderLinkStatus($(".asset-link-status", controls), result);
        event.currentTarget.disabled = false;
        event.currentTarget.textContent = "🔗 Revisar";
      });
    }

    $(".asset-admin-select", controls).checked = selected.has(String(asset.id));
    $("[data-admin-action='hidden']", controls).textContent = asset.is_hidden ? "👁 Publicar" : "🙈 Ocultar";
    $("[data-admin-action='featured']", controls).textContent = asset.is_featured ? "☆ Quitar" : "★ Destacar";
    $("[data-admin-action='nsfw']", controls).textContent = isNsfw(asset) ? "🔞 Quitar NSFW" : "🔞 NSFW";
    renderLinkStatus($(".asset-link-status", controls), adminData.linkResults.get(String(asset.id)));
  }

  function enhanceCards() {
    $$(".asset-card").forEach((card) => {
      const asset = findAsset(card.dataset.assetId);
      if (!asset) return;
      ensureNsfwVisual(card, asset);
      ensureFeaturedHiddenBadges(card, asset);
      ensureReportButton(card, asset);
      ensureAdminControls(card, asset);
    });
    updateBulkSelectionCount();
  }

  function ensureAdminWorkspace() {
    const adminCard = $("#adminForm");
    if (!adminCard || $("#adminWorkspace")) return;

    const workspace = document.createElement("section");
    workspace.id = "adminWorkspace";
    workspace.className = "asset-admin-workspace";
    workspace.hidden = true;
    workspace.innerHTML = `
      <div class="asset-admin-v2-head">
        <div>
          <span class="asset-panel-kicker">ADMIN V2</span>
          <h3>Centro de gestión</h3>
        </div>
        <span class="asset-admin-role" id="adminRoleBadge"></span>
      </div>

      <nav class="asset-admin-tabs" aria-label="Secciones de administración">
        <button type="button" class="active" data-admin-tab="overview">Resumen</button>
        <button type="button" data-admin-tab="reports">Reportes <span id="adminPendingBadge"></span></button>
        <button type="button" data-admin-tab="activity">Actividad</button>
        <button type="button" data-admin-tab="team">Equipo</button>
      </nav>

      <div class="asset-admin-tab-panel active" data-admin-panel="overview">
        <div class="asset-admin-migration" id="adminMigrationNotice" hidden>
          <strong>⚙️ Falta activar Admin v2 en Supabase</strong>
          <span>El frontend ya está preparado. Ejecuta el SQL de migración una sola vez.</span>
          <a href="https://github.com/SinNombre-vr/ToolHub.github.io/blob/main/supabase/toolhub-admin-v2.sql" target="_blank" rel="noopener noreferrer">Abrir SQL ↗</a>
        </div>
        <div class="asset-admin-stats-grid" id="adminStatsGrid"></div>
        <div class="asset-admin-section">
          <div class="asset-admin-section-head"><strong>Acciones múltiples</strong><span id="bulkSelectionCount">0 seleccionados</span></div>
          <div class="asset-admin-bulk-actions">
            <button type="button" data-bulk="hide">🙈 Ocultar</button>
            <button type="button" data-bulk="show">👁 Publicar</button>
            <button type="button" data-bulk="feature">★ Destacar</button>
            <button type="button" data-bulk="unfeature">☆ Quitar destacado</button>
            <button type="button" data-bulk="nsfw">🔞 Marcar NSFW</button>
            <button type="button" data-bulk="safe">✓ Quitar NSFW</button>
            <button type="button" data-bulk="category">🏷️ Categoría</button>
            <button type="button" data-bulk="delete" class="danger">🗑️ Eliminar</button>
          </div>
        </div>
        <div class="asset-admin-section">
          <div class="asset-admin-section-head"><strong>Mantenimiento</strong></div>
          <div class="asset-admin-maintenance-actions">
            <button type="button" id="adminCheckLinks">🔗 Comprobar enlaces cargados</button>
            <button type="button" id="adminExportJson">💾 Exportar JSON</button>
            <button type="button" id="adminExportCsv">📄 Exportar CSV</button>
            <button type="button" id="adminRefresh">↻ Actualizar datos</button>
          </div>
          <div class="asset-admin-progress" id="adminMaintenanceStatus"></div>
        </div>
      </div>

      <div class="asset-admin-tab-panel" data-admin-panel="reports">
        <div class="asset-admin-list" id="adminReportsList"></div>
      </div>

      <div class="asset-admin-tab-panel" data-admin-panel="activity">
        <div class="asset-admin-list" id="adminActivityList"></div>
      </div>

      <div class="asset-admin-tab-panel" data-admin-panel="team">
        <div id="adminTeamOwnerOnly"></div>
        <div class="asset-admin-list" id="adminTeamList"></div>
      </div>
    `;
    adminCard.appendChild(workspace);

    $$("[data-admin-tab]", workspace).forEach((button) => {
      button.addEventListener("click", () => {
        $$("[data-admin-tab]", workspace).forEach((x) => x.classList.toggle("active", x === button));
        $$("[data-admin-panel]", workspace).forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === button.dataset.adminTab));
      });
    });

    $$("[data-bulk]", workspace).forEach((button) => button.addEventListener("click", () => runBulkAction(button.dataset.bulk)));
    $("#adminCheckLinks").addEventListener("click", checkAllLoadedLinks);
    $("#adminExportJson").addEventListener("click", exportJson);
    $("#adminExportCsv").addEventListener("click", exportCsv);
    $("#adminRefresh").addEventListener("click", async () => {
      await api.refresh();
      await refreshAdminData();
    });
  }

  function updateAdminWorkspaceVisibility() {
    ensureAdminWorkspace();
    const workspace = $("#adminWorkspace");
    if (!workspace) return;
    workspace.hidden = !canManage();
    $("#adminRoleBadge").textContent = canManage() ? (state().adminRole || "admin").toUpperCase() : "";
    $("[data-admin-tab='team']").hidden = !canManageAdmins();
    $("#adminMigrationNotice").hidden = !canManage() || state().schemaV2;
    renderAdminStats();
  }

  function statCard(value, label, tone = "") {
    return `<div class="asset-admin-stat ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function renderAdminStats() {
    const grid = $("#adminStatsGrid");
    if (!grid) return;
    const assets = state().assets;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const hidden = assets.filter((a) => a.is_hidden).length;
    const featured = assets.filter((a) => a.is_featured).length;
    const nsfw = assets.filter(isNsfw).length;
    const weekly = assets.filter((a) => new Date(a.created_at || 0).getTime() >= weekAgo).length;
    const pending = adminData.reports.filter((r) => r.status === "pending").length;
    grid.innerHTML = [
      statCard(assets.length, "Assets"),
      statCard(nsfw, "NSFW", nsfw ? "danger" : ""),
      statCard(featured, "Destacados", "feature"),
      statCard(hidden, "Ocultos"),
      statCard(weekly, "Últimos 7 días"),
      statCard(pending, "Reportes pendientes", pending ? "danger" : "")
    ].join("");
    const badge = $("#adminPendingBadge");
    if (badge) badge.textContent = pending ? String(pending) : "";
  }

  function updateBulkSelectionCount() {
    const el = $("#bulkSelectionCount");
    if (el) el.textContent = `${selected.size} seleccionados`;
  }

  async function runBulkAction(action) {
    if (!canManage()) return;
    const ids = [...selected];
    if (!ids.length) {
      alert("Selecciona al menos una ficha.");
      return;
    }
    const assets = ids.map(findAsset).filter(Boolean);
    const client = db();
    if (!client) return;

    if (["hide", "show", "feature", "unfeature"].includes(action) && !state().schemaV2) return alertMigration();
    if (action === "delete" && !canDelete()) {
      alert("Tu rol no puede eliminar definitivamente.");
      return;
    }

    let error = null;
    if (action === "hide" || action === "show") {
      ({ error } = await client.from("assets").update({ is_hidden: action === "hide" }).in("id", ids));
    } else if (action === "feature" || action === "unfeature") {
      ({ error } = await client.from("assets").update({ is_featured: action === "feature" }).in("id", ids));
    } else if (action === "nsfw" || action === "safe") {
      const results = await Promise.all(assets.map((asset) => {
        let tags = normalizeTags(asset.tags).filter((tag) => tag !== "nsfw");
        if (action === "nsfw") tags.push("nsfw");
        return client.from("assets").update({ tags }).eq("id", asset.id);
      }));
      error = results.find((r) => r.error)?.error || null;
    } else if (action === "category") {
      const category = prompt(`Nueva categoría:\n${CATEGORIES.join(" / ")}`);
      if (!category) return;
      const normalized = CATEGORIES.find((x) => x.toLowerCase() === category.trim().toLowerCase());
      if (!normalized) return alert("Categoría no válida.");
      ({ error } = await client.from("assets").update({ category: normalized }).in("id", ids));
    } else if (action === "delete") {
      if (!confirm(`¿Eliminar definitivamente ${ids.length} fichas?`)) return;
      ({ error } = await client.from("assets").delete().in("id", ids));
    }

    if (error) {
      alert(`La acción no se pudo completar: ${error.message}`);
      return;
    }

    selected.clear();
    await api.refresh();
    await refreshAdminData();
    api.setSyncStatus("✅ Acción múltiple completada", "ok");
  }

  async function loadReports() {
    if (!canManage() || !state().schemaV2) {
      adminData.reports = [];
      renderReports();
      return;
    }
    const client = db();
    const { data, error } = await client
      .from("toolhub_reports")
      .select("id,asset_id,reason,details,status,created_at,reviewed_at,resolution_note,assets(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    adminData.reports = error ? [] : (data || []);
    renderReports();
  }

  function renderReports() {
    const list = $("#adminReportsList");
    if (!list) return;
    if (!state().schemaV2) {
      list.innerHTML = '<div class="asset-admin-empty">Activa Admin v2 en Supabase para usar reportes.</div>';
      return;
    }
    if (!adminData.reports.length) {
      list.innerHTML = '<div class="asset-admin-empty">No hay reportes.</div>';
      return;
    }
    list.innerHTML = "";
    adminData.reports.forEach((report) => {
      const item = document.createElement("article");
      item.className = `asset-admin-list-item report-${report.status}`;
      const date = new Date(report.created_at).toLocaleString("es-ES");
      item.innerHTML = `
        <div class="asset-admin-list-main">
          <div class="asset-admin-list-title"><strong>${escapeHtml(report.assets?.name || "Asset eliminado")}</strong><span>${escapeHtml(REASONS[report.reason] || report.reason)}</span></div>
          <p>${escapeHtml(report.details || "Sin detalles.")}</p>
          <small>${escapeHtml(date)} · ${escapeHtml(report.status)}</small>
        </div>
        <div class="asset-admin-list-actions"></div>
      `;
      const actions = $(".asset-admin-list-actions", item);
      if (report.status === "pending") {
        const resolve = document.createElement("button");
        resolve.type = "button";
        resolve.textContent = "✓ Resolver";
        resolve.addEventListener("click", () => resolveReport(report, "resolved"));
        actions.appendChild(resolve);
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.textContent = "Descartar";
        dismiss.addEventListener("click", () => resolveReport(report, "dismissed"));
        actions.appendChild(dismiss);
      }
      if (canDelete()) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Eliminar";
        remove.addEventListener("click", () => deleteReport(report));
        actions.appendChild(remove);
      }
      list.appendChild(item);
    });
  }

  async function resolveReport(report, status) {
    const note = prompt("Nota de resolución (opcional):", report.resolution_note || "") ?? "";
    const { error } = await db().from("toolhub_reports").update({
      status,
      resolution_note: note,
      reviewed_at: new Date().toISOString(),
      reviewer_id: state().adminUser?.id || null
    }).eq("id", report.id);
    if (error) return alert(error.message);
    await loadReports();
    renderAdminStats();
  }

  async function deleteReport(report) {
    if (!confirm("¿Eliminar este reporte?")) return;
    const { error } = await db().from("toolhub_reports").delete().eq("id", report.id);
    if (error) return alert(error.message);
    await loadReports();
    renderAdminStats();
  }

  async function loadActivity() {
    if (!canManage() || !state().schemaV2) {
      adminData.activity = [];
      renderActivity();
      return;
    }
    const { data, error } = await db().from("toolhub_activity").select("id,actor_id,action,asset_id,asset_name,metadata,created_at").order("created_at", { ascending: false }).limit(150);
    adminData.activity = error ? [] : (data || []);
    renderActivity();
  }

  function activityLabel(action) {
    return ({
      asset_created: "Publicado",
      asset_deleted: "Eliminado",
      asset_hidden: "Ocultado",
      asset_published: "Vuelto a publicar",
      asset_featured: "Destacado",
      asset_unfeatured: "Destacado retirado",
      asset_tags_updated: "Tags / NSFW actualizados",
      asset_updated: "Ficha editada"
    })[action] || action;
  }

  function renderActivity() {
    const list = $("#adminActivityList");
    if (!list) return;
    if (!state().schemaV2) {
      list.innerHTML = '<div class="asset-admin-empty">Activa Admin v2 en Supabase para registrar actividad.</div>';
      return;
    }
    if (!adminData.activity.length) {
      list.innerHTML = '<div class="asset-admin-empty">Todavía no hay actividad registrada.</div>';
      return;
    }
    list.innerHTML = adminData.activity.map((entry) => `
      <article class="asset-admin-list-item compact">
        <div class="asset-admin-list-main">
          <div class="asset-admin-list-title"><strong>${escapeHtml(entry.asset_name || "Asset")}</strong><span>${escapeHtml(activityLabel(entry.action))}</span></div>
          <small>${escapeHtml(new Date(entry.created_at).toLocaleString("es-ES"))}</small>
        </div>
      </article>
    `).join("");
  }

  async function loadAdmins() {
    if (!canManageAdmins() || !state().schemaV2) {
      adminData.admins = [];
      renderTeam();
      return;
    }
    const { data, error } = await db().rpc("toolhub_list_admins");
    adminData.admins = error ? [] : (data || []);
    renderTeam(error);
  }

  function renderTeam(error = null) {
    const ownerBox = $("#adminTeamOwnerOnly");
    const list = $("#adminTeamList");
    if (!ownerBox || !list) return;
    if (!canManageAdmins()) {
      ownerBox.innerHTML = '<div class="asset-admin-empty">Solo el propietario puede gestionar el equipo.</div>';
      list.innerHTML = "";
      return;
    }
    if (!state().schemaV2 || error) {
      ownerBox.innerHTML = '<div class="asset-admin-empty">Activa Admin v2 en Supabase para gestionar roles.</div>';
      list.innerHTML = "";
      return;
    }
    ownerBox.innerHTML = `
      <div class="asset-admin-add-user">
        <input id="adminNewEmail" type="email" placeholder="correo@ejemplo.com" autocomplete="off">
        <select id="adminNewRole"><option value="moderator">Moderador</option><option value="admin">Administrador</option><option value="owner">Propietario</option></select>
        <button type="button" id="adminAddUser">Añadir / actualizar</button>
      </div>
      <small class="asset-admin-hint">La cuenta debe existir primero en Supabase Authentication.</small>
    `;
    $("#adminAddUser").addEventListener("click", addAdmin);

    list.innerHTML = "";
    adminData.admins.forEach((user) => {
      const item = document.createElement("article");
      item.className = "asset-admin-list-item compact";
      item.innerHTML = `
        <div class="asset-admin-list-main">
          <div class="asset-admin-list-title"><strong>${escapeHtml(user.email || user.user_id)}</strong><span>${escapeHtml(user.role)}</span></div>
          <small>${escapeHtml(user.user_id)}</small>
        </div>
        <div class="asset-admin-list-actions"></div>
      `;
      if (String(user.user_id) !== String(state().adminUser?.id)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Quitar";
        remove.addEventListener("click", () => removeAdmin(user));
        $(".asset-admin-list-actions", item).appendChild(remove);
      }
      list.appendChild(item);
    });
  }

  async function addAdmin() {
    const email = $("#adminNewEmail").value.trim();
    const role = $("#adminNewRole").value;
    if (!email) return;
    const { error } = await db().rpc("toolhub_add_admin_by_email", { target_email: email, target_role: role });
    if (error) return alert(error.message);
    await loadAdmins();
  }

  async function removeAdmin(user) {
    if (!confirm(`¿Quitar a ${user.email || user.user_id} del equipo?`)) return;
    const { error } = await db().rpc("toolhub_remove_admin", { target_user_id: user.user_id });
    if (error) return alert(error.message);
    await loadAdmins();
  }

  async function refreshAdminData() {
    updateAdminWorkspaceVisibility();
    if (!canManage()) return;
    await Promise.all([loadReports(), loadActivity(), loadAdmins()]);
    renderAdminStats();
    enhanceCards();
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: "23.0",
      count: state().assets.length,
      assets: state().assets
    };
    downloadText(`toolhub-assets-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function csvCell(value) {
    const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const headers = ["id","name","category","author","platform","author_url","preview_url","download_url","tags","description","nsfw","featured","hidden","created_at","updated_at"];
    const rows = state().assets.map((asset) => [
      asset.id, asset.name, asset.category, asset.author, asset.platform, asset.author_url, asset.preview_url,
      asset.download_url, asset.tags, asset.description, isNsfw(asset), Boolean(asset.is_featured), Boolean(asset.is_hidden), asset.created_at, asset.updated_at
    ]);
    downloadText(`toolhub-assets-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8");
  }

  function withTimeout(promise, ms = 7000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
    ]);
  }

  async function checkHttpUrl(url) {
    const safe = api.safeUrl(url);
    if (!safe) return "broken";
    try {
      const response = await withTimeout(fetch(safe, { method: "HEAD", mode: "cors", cache: "no-store" }));
      if (response.ok) return "ok";
      if ([404, 410].includes(response.status)) return "broken";
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  function checkImageUrl(url) {
    const safe = api.safeUrl(url);
    if (!safe) return Promise.resolve("broken");
    return withTimeout(new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve("ok");
      image.onerror = () => resolve("broken");
      image.src = `${safe}${safe.includes("?") ? "&" : "?"}toolhub_check=${Date.now()}`;
    })).catch(() => "unknown");
  }

  async function checkAssetLinks(asset) {
    const [author, preview, download] = await Promise.all([
      checkHttpUrl(asset.author_url),
      asset.preview_url ? checkImageUrl(asset.preview_url) : Promise.resolve("unknown"),
      checkHttpUrl(asset.download_url)
    ]);
    return { author, preview, download };
  }

  async function checkAllLoadedLinks() {
    if (!canManage()) return;
    const button = $("#adminCheckLinks");
    const status = $("#adminMaintenanceStatus");
    const assets = state().assets;
    button.disabled = true;
    for (let i = 0; i < assets.length; i += 1) {
      status.textContent = `Comprobando ${i + 1}/${assets.length} · ${assets[i].name}`;
      adminData.linkResults.set(String(assets[i].id), await checkAssetLinks(assets[i]));
      enhanceCards();
    }
    const broken = [...adminData.linkResults.values()].filter((r) => Object.values(r).includes("broken")).length;
    status.textContent = broken ? `Comprobación terminada · ${broken} fichas con algún error confirmado.` : "Comprobación terminada · sin errores confirmados. Los '?' indican sitios que bloquean la comprobación por CORS.";
    button.disabled = false;
  }

  document.addEventListener("toolhub-assets-rendered", () => {
    enhanceCards();
    renderAdminStats();
  });

  document.addEventListener("toolhub-admin-changed", () => {
    selected.clear();
    updateAdminWorkspaceVisibility();
    refreshAdminData();
  });

  document.addEventListener("toolhub-assets-ready", () => {
    ensureAdminWorkspace();
    updateAdminWorkspaceVisibility();
    enhanceCards();
    refreshAdminData();
  });

  ensureAdminWorkspace();
  updateAdminWorkspaceVisibility();
  enhanceCards();
})();
