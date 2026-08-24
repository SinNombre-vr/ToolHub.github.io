
(() => {
  "use strict";

  const TOOL_MAP = {
    embed: document.getElementById("discordEmbedBackdrop"),
    structure: document.getElementById("discordStructureBackdrop"),
    roles: document.getElementById("discordRolesBackdrop"),
    security: document.getElementById("discordSecurityBackdrop"),
  };

  let previousFocus = null;

  function openTool(name) {
    const backdrop = TOOL_MAP[name];
    if (!backdrop) return;

    previousFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      backdrop.querySelector(".modal-close")?.focus();
    });
  }

  function closeTool(name) {
    const backdrop = TOOL_MAP[name];
    if (!backdrop) return;

    backdrop.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  document.querySelectorAll("[data-discord-tool]").forEach((button) => {
    button.addEventListener("click", () => openTool(button.dataset.discordTool));
  });

  document.querySelectorAll("[data-discord-close]").forEach((button) => {
    button.addEventListener("click", () => closeTool(button.dataset.discordClose));
  });

  Object.entries(TOOL_MAP).forEach(([name, backdrop]) => {
    if (!backdrop) return;

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeTool(name);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const openEntry = Object.entries(TOOL_MAP).find(([, backdrop]) => backdrop && !backdrop.hidden);

    if (openEntry) {
      event.preventDefault();
      closeTool(openEntry[0]);
    }
  });

  async function copyText(text, statusElement, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (statusElement) {
        statusElement.textContent = successMessage;
        statusElement.className = "discord-tool-status success";
      }
    } catch {
      if (statusElement) {
        statusElement.textContent = "No se pudo copiar automáticamente. Selecciona el texto manualmente.";
        statusElement.className = "discord-tool-status error";
      }
    }
  }

  function downloadText(text, filename, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  // ==========================================================
  // EMBED BUILDER
  // ==========================================================
  const embedEls = {
    author: document.getElementById("embedAuthor"),
    title: document.getElementById("embedTitle"),
    description: document.getElementById("embedDescription"),
    color: document.getElementById("embedColor"),
    footer: document.getElementById("embedFooter"),
    image: document.getElementById("embedImage"),
    thumbnail: document.getElementById("embedThumbnail"),
    fieldsEditor: document.getElementById("embedFieldsEditor"),
    previewCard: document.getElementById("embedPreviewCard"),
    previewAuthor: document.getElementById("embedPreviewAuthor"),
    previewTitle: document.getElementById("embedPreviewTitle"),
    previewDescription: document.getElementById("embedPreviewDescription"),
    previewFields: document.getElementById("embedPreviewFields"),
    previewMedia: document.getElementById("embedPreviewMedia"),
    previewImage: document.getElementById("embedPreviewImage"),
    previewThumbnail: document.getElementById("embedPreviewThumbnail"),
    previewFooter: document.getElementById("embedPreviewFooter"),
    status: document.getElementById("embedStatus"),
  };

  let embedFields = [];

  function safeUrl(value) {
    const url = String(value || "").trim();

    if (!url) return "";

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) return "";

      return parsed.href;
    } catch {
      return "";
    }
  }

  function hexToInt(hex) {
    return parseInt(String(hex).replace("#", ""), 16) || 0;
  }

  function embedData() {
    const embed = {};

    const author = embedEls.author?.value.trim() || "";
    const title = embedEls.title?.value.trim() || "";
    const description = embedEls.description?.value.trim() || "";
    const footer = embedEls.footer?.value.trim() || "";
    const image = safeUrl(embedEls.image?.value);
    const thumbnail = safeUrl(embedEls.thumbnail?.value);

    if (author) embed.author = { name: author };
    if (title) embed.title = title;
    if (description) embed.description = description;

    embed.color = hexToInt(embedEls.color?.value || "#5865F2");

    if (embedFields.length) {
      embed.fields = embedFields
        .filter((field) => field.name.trim() || field.value.trim())
        .map((field) => ({
          name: field.name.trim() || "\u200B",
          value: field.value.trim() || "\u200B",
          inline: Boolean(field.inline),
        }));
    }

    if (image) embed.image = { url: image };
    if (thumbnail) embed.thumbnail = { url: thumbnail };
    if (footer) embed.footer = { text: footer };

    return embed;
  }

  function renderEmbedFieldsEditor() {
    if (!embedEls.fieldsEditor) return;

    embedEls.fieldsEditor.innerHTML = "";

    embedFields.forEach((field, index) => {
      const row = document.createElement("div");
      row.className = "embed-field-editor";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.maxLength = 256;
      nameInput.placeholder = "Nombre del campo";
      nameInput.value = field.name;

      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.maxLength = 1024;
      valueInput.placeholder = "Contenido";
      valueInput.value = field.value;

      const actions = document.createElement("div");
      actions.style.display = "grid";
      actions.style.gap = "5px";

      const inlineLabel = document.createElement("label");
      const inlineCheck = document.createElement("input");
      inlineCheck.type = "checkbox";
      inlineCheck.checked = field.inline;
      inlineLabel.append(inlineCheck, document.createTextNode("Inline"));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "discord-mini-button danger";
      remove.textContent = "Quitar";

      nameInput.addEventListener("input", () => {
        embedFields[index].name = nameInput.value;
        renderEmbedPreview();
      });

      valueInput.addEventListener("input", () => {
        embedFields[index].value = valueInput.value;
        renderEmbedPreview();
      });

      inlineCheck.addEventListener("change", () => {
        embedFields[index].inline = inlineCheck.checked;
        renderEmbedPreview();
      });

      remove.addEventListener("click", () => {
        embedFields.splice(index, 1);
        renderEmbedFieldsEditor();
        renderEmbedPreview();
      });

      actions.append(inlineLabel, remove);
      row.append(nameInput, valueInput, actions);
      embedEls.fieldsEditor.append(row);
    });
  }

  function renderEmbedPreview() {
    if (!embedEls.previewCard) return;

    embedEls.previewCard.style.setProperty("--embed-color", embedEls.color?.value || "#5865F2");

    const author = embedEls.author?.value.trim() || "";
    const title = embedEls.title?.value.trim() || "";
    const description = embedEls.description?.value.trim() || "";
    const footer = embedEls.footer?.value.trim() || "";

    embedEls.previewAuthor.hidden = !author;
    embedEls.previewAuthor.textContent = author;

    embedEls.previewTitle.hidden = !title;
    embedEls.previewTitle.textContent = title;

    embedEls.previewDescription.textContent = description || "Tu embed aparecerá aquí.";

    embedEls.previewFooter.hidden = !footer;
    embedEls.previewFooter.textContent = footer;

    embedEls.previewFields.innerHTML = "";

    embedFields.forEach((field) => {
      if (!field.name.trim() && !field.value.trim()) return;

      const wrapper = document.createElement("div");
      wrapper.className = `embed-field${field.inline ? "" : " full"}`;

      const strong = document.createElement("strong");
      strong.textContent = field.name || "\u200B";

      const span = document.createElement("span");
      span.textContent = field.value || "\u200B";

      wrapper.append(strong, span);
      embedEls.previewFields.append(wrapper);
    });

    const image = safeUrl(embedEls.image?.value);
    const thumbnail = safeUrl(embedEls.thumbnail?.value);

    embedEls.previewImage.hidden = !image;
    embedEls.previewThumbnail.hidden = !thumbnail;
    embedEls.previewMedia.hidden = !image && !thumbnail;

    if (image) embedEls.previewImage.src = image;
    else embedEls.previewImage.removeAttribute("src");

    if (thumbnail) embedEls.previewThumbnail.src = thumbnail;
    else embedEls.previewThumbnail.removeAttribute("src");
  }

  [
    embedEls.author,
    embedEls.title,
    embedEls.description,
    embedEls.color,
    embedEls.footer,
    embedEls.image,
    embedEls.thumbnail,
  ].forEach((element) => {
    element?.addEventListener("input", renderEmbedPreview);
    element?.addEventListener("change", renderEmbedPreview);
  });

  document.getElementById("addEmbedField")?.addEventListener("click", () => {
    if (embedFields.length >= 25) {
      embedEls.status.textContent = "Discord admite un máximo de 25 campos por embed.";
      embedEls.status.className = "discord-tool-status error";
      return;
    }

    embedFields.push({
      name: "",
      value: "",
      inline: false,
    });

    renderEmbedFieldsEditor();
    renderEmbedPreview();
  });

  document.getElementById("clearEmbed")?.addEventListener("click", () => {
    [
      embedEls.author,
      embedEls.title,
      embedEls.description,
      embedEls.footer,
      embedEls.image,
      embedEls.thumbnail,
    ].forEach((element) => {
      if (element) element.value = "";
    });

    if (embedEls.color) embedEls.color.value = "#5865F2";

    embedFields = [];
    renderEmbedFieldsEditor();
    renderEmbedPreview();

    embedEls.status.textContent = "Embed limpiado.";
    embedEls.status.className = "discord-tool-status";
  });

  document.getElementById("copyEmbedJson")?.addEventListener("click", () => {
    const json = JSON.stringify({ embeds: [embedData()] }, null, 2);
    copyText(json, embedEls.status, "JSON copiado al portapapeles.");
  });

  document.getElementById("downloadEmbedJson")?.addEventListener("click", () => {
    const json = JSON.stringify({ embeds: [embedData()] }, null, 2);
    downloadText(json, "discord-embed.json", "application/json");

    embedEls.status.textContent = "Archivo JSON generado.";
    embedEls.status.className = "discord-tool-status success";
  });

  renderEmbedFieldsEditor();
  renderEmbedPreview();

  // ==========================================================
  // SERVER STRUCTURE
  // ==========================================================
  const structureResult = document.getElementById("structureResult");
  const structureStatus = document.getElementById("structureStatus");

  const PRESETS = {
    community: {
      name: "Comunidad",
      main: ["💬・general", "📸・multimedia", "🤝・presentaciones", "🎉・eventos"],
      voice: ["🔊 General", "🎵 Música", "🌙 AFK"],
    },
    gaming: {
      name: "Gaming",
      main: ["💬・general", "🎮・busca-grupo", "🏆・clips-y-logros", "📰・gaming-news"],
      voice: ["🎮 Squad 1", "🎮 Squad 2", "🔊 Chill", "🌙 AFK"],
    },
    vrchat: {
      name: "VRChat",
      main: ["💬・general", "🌐・mundos", "🧍・avatares", "📸・fotos-vrchat", "🎉・quedadas"],
      voice: ["🥽 VRChat", "🗣️ Chill", "🎵 Música", "🌙 AFK"],
    },
    creator: {
      name: "Creador",
      main: ["💬・comunidad", "📢・novedades", "🎨・creaciones", "💡・sugerencias", "📸・media"],
      voice: ["🔊 Comunidad", "🎙️ Directos", "🌙 AFK"],
    },
    study: {
      name: "Estudio / Proyecto",
      main: ["💬・general", "📌・tareas", "📚・recursos", "💡・ideas", "✅・progreso"],
      voice: ["🧠 Trabajo", "☕ Descanso", "🌙 AFK"],
    },
  };

  function buildStructure() {
    const presetKey = document.getElementById("structurePreset")?.value || "community";
    const preset = PRESETS[presetKey] || PRESETS.community;
    const serverName = document.getElementById("structureServerName")?.value.trim() || "Mi Servidor";

    const includeWelcome = document.getElementById("structureWelcome")?.checked;
    const includeVoice = document.getElementById("structureVoice")?.checked;
    const includeStaff = document.getElementById("structureStaff")?.checked;
    const includeBots = document.getElementById("structureBots")?.checked;
    const includeLogs = document.getElementById("structureLogs")?.checked;

    const lines = [
      `SERVIDOR: ${serverName}`,
      `TIPO: ${preset.name}`,
      "",
    ];

    if (includeWelcome) {
      lines.push(
        "📥 ENTRADA",
        "  # 👋・bienvenida",
        "  # 📜・reglas",
        "  # 🤝・presentaciones",
        ""
      );
    }

    lines.push("💬 COMUNIDAD");

    preset.main.forEach((channel) => {
      lines.push(`  # ${channel}`);
    });

    if (includeBots) {
      lines.push("  # 🤖・comandos-bots");
    }

    lines.push("");

    if (includeVoice) {
      lines.push("🔊 VOZ");

      preset.voice.forEach((channel) => {
        lines.push(`  🔊 ${channel}`);
      });

      lines.push("");
    }

    if (includeStaff) {
      lines.push(
        "🛡️ STAFF (privado)",
        "  # 💬・staff-chat",
        "  # 📋・casos-moderacion"
      );

      if (includeLogs) {
        lines.push("  # 📑・logs");
      }

      lines.push("  🔊 Staff", "");
    } else if (includeLogs) {
      lines.push(
        "📑 MODERACIÓN",
        "  # 📑・logs",
        ""
      );
    }

    lines.push(
      "NOTAS:",
      "- Revisa permisos de @everyone antes de abrir el servidor.",
      "- Mantén los canales de staff privados.",
      "- Ajusta nombres y categorías al tamaño real de la comunidad."
    );

    return lines.join("\n");
  }

  function renderStructure() {
    if (!structureResult) return;

    structureResult.textContent = buildStructure();

    structureStatus.textContent = "Estructura generada. Puedes copiarla o descargarla.";
    structureStatus.className = "discord-tool-status success";
  }

  document.getElementById("generateStructure")?.addEventListener("click", renderStructure);

  document.getElementById("copyStructure")?.addEventListener("click", () => {
    const text = structureResult?.textContent || buildStructure();
    copyText(text, structureStatus, "Estructura copiada.");
  });

  document.getElementById("downloadStructure")?.addEventListener("click", () => {
    const text = structureResult?.textContent || buildStructure();
    downloadText(text, "estructura-discord.txt");

    structureStatus.textContent = "Estructura descargada.";
    structureStatus.className = "discord-tool-status success";
  });

  renderStructure();

  // ==========================================================
  // ROLES & PERMISSIONS
  // ==========================================================
  let roles = [];

  const rolesList = document.getElementById("rolesList");
  const rolesStatus = document.getElementById("rolesStatus");

  const CRITICAL_PERMS = new Set([
    "Administrator",
    "Manage Server",
    "Manage Roles",
  ]);

  const SENSITIVE_PERMS = new Set([
    "Ban Members",
    "Kick Members",
    "Manage Channels",
    "Manage Messages",
    "Mention Everyone",
  ]);

  function selectedPermissions() {
    return [...document.querySelectorAll("#permissionGrid input[type='checkbox']:checked")]
      .map((input) => input.value);
  }

  function clearPermissionSelection() {
    document.querySelectorAll("#permissionGrid input[type='checkbox']").forEach((input) => {
      input.checked = false;
    });
  }

  function permissionRisk(perms) {
    if (perms.some((perm) => CRITICAL_PERMS.has(perm))) return "ALTO";
    if (perms.some((perm) => SENSITIVE_PERMS.has(perm))) return "MEDIO";
    return "BAJO";
  }

  function rolesText() {
    if (!roles.length) {
      return "No hay roles configurados.";
    }

    const lines = [
      "JERARQUÍA DE ROLES (arriba = mayor prioridad)",
      "",
    ];

    roles.forEach((role, index) => {
      lines.push(
        `${index + 1}. ${role.name}`,
        `   Color: ${role.color}`,
        `   Riesgo: ${permissionRisk(role.permissions)}`,
        `   Permisos: ${role.permissions.length ? role.permissions.join(", ") : "Sin permisos sensibles seleccionados"}`,
        ""
      );
    });

    lines.push(
      "REVISIÓN RECOMENDADA:",
      "- Mantén Administrator limitado al mínimo posible.",
      "- Un rol solo puede gestionar roles situados por debajo de él.",
      "- Revisa los permisos de bots de la misma forma que los roles humanos."
    );

    return lines.join("\n");
  }

  function renderRoles() {
    if (!rolesList) return;

    rolesList.innerHTML = "";

    roles.forEach((role, index) => {
      const card = document.createElement("div");
      card.className = "role-card";

      const dot = document.createElement("div");
      dot.className = "role-color-dot";
      dot.style.background = role.color;

      const info = document.createElement("div");

      const strong = document.createElement("strong");
      strong.textContent = `${index + 1}. ${role.name}`;

      const small = document.createElement("small");
      const risk = permissionRisk(role.permissions);
      small.textContent = `${role.permissions.length} permisos · Riesgo ${risk}`;

      info.append(strong, small);

      const actions = document.createElement("div");
      actions.className = "role-actions";

      const up = document.createElement("button");
      up.type = "button";
      up.className = "discord-mini-button";
      up.textContent = "↑";
      up.disabled = index === 0;

      const down = document.createElement("button");
      down.type = "button";
      down.className = "discord-mini-button";
      down.textContent = "↓";
      down.disabled = index === roles.length - 1;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "discord-mini-button danger";
      remove.textContent = "×";

      up.addEventListener("click", () => {
        [roles[index - 1], roles[index]] = [roles[index], roles[index - 1]];
        renderRoles();
      });

      down.addEventListener("click", () => {
        [roles[index + 1], roles[index]] = [roles[index], roles[index + 1]];
        renderRoles();
      });

      remove.addEventListener("click", () => {
        roles.splice(index, 1);
        renderRoles();
      });

      actions.append(up, down, remove);
      card.append(dot, info, actions);
      rolesList.append(card);
    });

    if (!roles.length) {
      const empty = document.createElement("div");
      empty.className = "discord-tool-status";
      empty.textContent = "Todavía no hay roles.";
      rolesList.append(empty);
    }

    const highRisk = roles.filter((role) => permissionRisk(role.permissions) === "ALTO").length;

    if (highRisk) {
      rolesStatus.textContent = `${highRisk} rol(es) contienen permisos de riesgo alto. Revísalos antes de aplicarlos.`;
      rolesStatus.className = "discord-tool-status error";
    } else if (roles.length) {
      rolesStatus.textContent = "Jerarquía preparada. Revisa permisos antes de aplicarla en Discord.";
      rolesStatus.className = "discord-tool-status success";
    } else {
      rolesStatus.textContent = "Añade roles o usa el preset base segura.";
      rolesStatus.className = "discord-tool-status";
    }
  }

  document.getElementById("addRole")?.addEventListener("click", () => {
    const nameInput = document.getElementById("roleName");
    const colorInput = document.getElementById("roleColor");

    const name = nameInput?.value.trim() || "";

    if (!name) {
      rolesStatus.textContent = "Escribe un nombre para el rol.";
      rolesStatus.className = "discord-tool-status error";
      return;
    }

    roles.push({
      name,
      color: colorInput?.value || "#5865F2",
      permissions: selectedPermissions(),
    });

    if (nameInput) nameInput.value = "";
    clearPermissionSelection();
    renderRoles();
  });

  document.getElementById("safeRolePreset")?.addEventListener("click", () => {
    roles = [
      {
        name: "Owner",
        color: "#ED4245",
        permissions: ["Administrator"],
      },
      {
        name: "Admin",
        color: "#F47B67",
        permissions: ["Manage Server", "Manage Roles", "Manage Channels", "View Audit Log"],
      },
      {
        name: "Moderador",
        color: "#FEE75C",
        permissions: ["Kick Members", "Ban Members", "Manage Messages", "Moderate Members", "View Audit Log"],
      },
      {
        name: "Miembro",
        color: "#57F287",
        permissions: [],
      },
      {
        name: "Bots",
        color: "#5865F2",
        permissions: [],
      },
    ];

    renderRoles();

    rolesStatus.textContent = "Preset generado. Revisa y reduce los permisos según las necesidades reales.";
    rolesStatus.className = "discord-tool-status success";
  });

  document.getElementById("copyRoles")?.addEventListener("click", () => {
    copyText(rolesText(), rolesStatus, "Configuración de roles copiada.");
  });

  document.getElementById("clearRoles")?.addEventListener("click", () => {
    roles = [];
    clearPermissionSelection();
    renderRoles();
  });

  renderRoles();

  // ==========================================================
  // SECURITY CHECKLIST
  // ==========================================================
  const SECURITY_KEY = "toolhub_discord_security_checklist_v1";
  const securityInputs = [...document.querySelectorAll("[data-security-id]")];

  const securityProgressText = document.getElementById("securityProgressText");
  const securityProgressFill = document.getElementById("securityProgressFill");
  const securityReport = document.getElementById("securityReport");
  const securityStatus = document.getElementById("securityStatus");

  function loadSecurityState() {
    try {
      const raw = localStorage.getItem(SECURITY_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveSecurityState() {
    const state = {};

    securityInputs.forEach((input) => {
      state[input.dataset.securityId] = input.checked;
    });

    try {
      localStorage.setItem(SECURITY_KEY, JSON.stringify(state));
    } catch {
      // El guardado local es opcional.
    }
  }

  function buildSecurityReport() {
    const completed = [];
    const pending = [];

    securityInputs.forEach((input) => {
      const item = input.closest(".security-item");
      const title = item?.querySelector("strong")?.textContent || input.dataset.securityId;

      if (input.checked) completed.push(title);
      else pending.push(title);
    });

    return [
      "CHECKLIST DE SEGURIDAD - DISCORD",
      "",
      `Completado: ${completed.length}/${securityInputs.length}`,
      "",
      "REVISADO:",
      ...(completed.length ? completed.map((item) => `✓ ${item}`) : ["- Ningún punto marcado todavía"]),
      "",
      "PENDIENTE:",
      ...(pending.length ? pending.map((item) => `□ ${item}`) : ["✓ Todo revisado"]),
      "",
      "Nota: esta checklist es orientativa y debe adaptarse al tamaño, exposición y necesidades del servidor.",
    ].join("\n");
  }

  function renderSecurity() {
    const completed = securityInputs.filter((input) => input.checked).length;
    const total = securityInputs.length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    securityProgressText.textContent = `${completed} / ${total} · ${percentage}%`;
    securityProgressFill.style.width = `${percentage}%`;
    securityReport.textContent = buildSecurityReport();

    if (percentage === 100) {
      securityStatus.textContent = "Checklist completada. Conviene revisarla periódicamente.";
      securityStatus.className = "discord-tool-status success";
    } else {
      securityStatus.textContent = `${total - completed} punto(s) pendientes de revisión.`;
      securityStatus.className = "discord-tool-status";
    }
  }

  const initialSecurityState = loadSecurityState();

  securityInputs.forEach((input) => {
    input.checked = Boolean(initialSecurityState[input.dataset.securityId]);

    input.addEventListener("change", () => {
      saveSecurityState();
      renderSecurity();
    });
  });

  document.getElementById("resetSecurityChecklist")?.addEventListener("click", () => {
    securityInputs.forEach((input) => {
      input.checked = false;
    });

    try {
      localStorage.removeItem(SECURITY_KEY);
    } catch {
      // Sin acción.
    }

    renderSecurity();
  });

  document.getElementById("copySecurityReport")?.addEventListener("click", () => {
    copyText(buildSecurityReport(), securityStatus, "Informe de seguridad copiado.");
  });

  renderSecurity();
})();
