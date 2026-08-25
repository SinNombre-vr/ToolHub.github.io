(() => {
  "use strict";

  const form = document.querySelector("#assetForm");
  const tagsInput = document.querySelector("#assetTags");
  const grid = document.querySelector("#assetGrid");
  if (!form || !tagsInput || !grid) return;

  const tagsLabel = tagsInput.closest("label");
  if (!tagsLabel) return;

  const option = document.createElement("div");
  option.className = "asset-nsfw-option asset-form-wide";
  option.innerHTML = `
    <label class="asset-nsfw-check" for="assetNsfw">
      <input id="assetNsfw" type="checkbox">
      <span class="asset-nsfw-copy">
        <strong>Marcar como NSFW</strong>
        <small>No bloquea ni elimina la publicación. Solo difumina la preview y añade una etiqueta NSFW en la tarjeta.</small>
      </span>
    </label>
  `;
  tagsLabel.insertAdjacentElement("afterend", option);

  const nsfwCheckbox = option.querySelector("#assetNsfw");

  function parsedTags() {
    return String(tagsInput.value || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  }

  function setNsfwTag(enabled) {
    const tags = [...new Set(parsedTags().filter((tag) => tag !== "nsfw"))];
    if (enabled) tags.push("nsfw");
    tagsInput.value = tags.join(", ");
  }

  function syncCheckboxFromTags() {
    nsfwCheckbox.checked = parsedTags().includes("nsfw");
  }

  nsfwCheckbox.addEventListener("change", () => {
    setNsfwTag(nsfwCheckbox.checked);
  });

  tagsInput.addEventListener("input", syncCheckboxFromTags);

  // Captura el submit antes que el script principal para guardar el estado NSFW
  // dentro del tag "nsfw". Así no hace falta cambiar la estructura de Supabase.
  form.addEventListener("submit", () => {
    setNsfwTag(nsfwCheckbox.checked || parsedTags().includes("nsfw"));
  }, true);

  form.addEventListener("reset", () => {
    setTimeout(() => {
      nsfwCheckbox.checked = false;
    }, 0);
  });

  const dialog = document.createElement("dialog");
  dialog.className = "asset-preview-dialog";
  dialog.innerHTML = `
    <div class="asset-preview-dialog-head">
      <div class="asset-preview-dialog-title">Vista previa</div>
      <button class="asset-preview-dialog-close" type="button" aria-label="Cerrar">×</button>
    </div>
    <div class="asset-preview-dialog-warning" hidden>
      NSFW · Has solicitado mostrar esta preview sin difuminado.
    </div>
    <div class="asset-preview-dialog-media">
      <img alt="Vista previa del asset">
    </div>
  `;
  document.body.appendChild(dialog);

  const dialogTitle = dialog.querySelector(".asset-preview-dialog-title");
  const dialogWarning = dialog.querySelector(".asset-preview-dialog-warning");
  const dialogImage = dialog.querySelector("img");
  const dialogClose = dialog.querySelector(".asset-preview-dialog-close");

  function openPreview(card, image, isNsfw) {
    const src = image.currentSrc || image.src || image.getAttribute("src") || "";
    if (!src) return;

    const title = card.querySelector(".asset-title")?.textContent?.trim() || "Vista previa";
    dialogTitle.textContent = title;
    dialogWarning.hidden = !isNsfw;
    dialogImage.src = src;
    dialogImage.alt = `Vista previa de ${title}`;

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closePreview() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    dialogImage.removeAttribute("src");
  }

  dialogClose.addEventListener("click", closePreview);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePreview();
  });
  dialog.addEventListener("close", () => {
    dialogImage.removeAttribute("src");
  });

  function cardIsNsfw(card) {
    return Array.from(card.querySelectorAll(".asset-card-tags span"))
      .some((chip) => chip.textContent.trim().toLowerCase() === "#nsfw");
  }

  function enhanceCard(card) {
    if (card.dataset.nsfwEnhanced === "1") return;

    const previewWrap = card.querySelector(".asset-preview-wrap");
    const image = card.querySelector(".asset-preview");
    const platform = card.querySelector(".asset-platform-badge");
    if (!previewWrap || !image || !platform) return;

    card.dataset.nsfwEnhanced = "1";
    const isNsfw = cardIsNsfw(card);
    card.classList.toggle("is-nsfw", isNsfw);

    let badgeStack = previewWrap.querySelector(".asset-badge-stack");
    if (!badgeStack) {
      badgeStack = document.createElement("div");
      badgeStack.className = "asset-badge-stack";
      previewWrap.appendChild(badgeStack);
      badgeStack.appendChild(platform);
    }

    if (isNsfw && !badgeStack.querySelector(".asset-nsfw-badge")) {
      const nsfwBadge = document.createElement("span");
      nsfwBadge.className = "asset-nsfw-badge";
      nsfwBadge.textContent = "NSFW";
      badgeStack.appendChild(nsfwBadge);
    }

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "asset-preview-view-button";
    previewButton.innerHTML = "👁 <span>Ver imagen</span>";
    previewButton.title = isNsfw ? "Mostrar preview NSFW" : "Ver preview ampliada";
    previewButton.hidden = !image.getAttribute("src");
    previewWrap.appendChild(previewButton);

    if (!image.getAttribute("src")) {
      const watchImage = new MutationObserver(() => {
        if (image.getAttribute("src")) {
          previewButton.hidden = false;
          watchImage.disconnect();
        }
      });
      watchImage.observe(image, { attributes: true, attributeFilter: ["src"] });
    }

    previewButton.addEventListener("click", () => openPreview(card, image, isNsfw));
  }

  function enhanceCards() {
    grid.querySelectorAll(".asset-card").forEach(enhanceCard);
  }

  const observer = new MutationObserver(enhanceCards);
  observer.observe(grid, { childList: true });
  enhanceCards();
  syncCheckboxFromTags();
})();
