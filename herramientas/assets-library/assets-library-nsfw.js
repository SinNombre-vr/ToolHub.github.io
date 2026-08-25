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
        <small>No bloquea ni elimina la publicación. La imagen queda oculta en la tarjeta hasta que el visitante pulse Ver imagen.</small>
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

  form.addEventListener("submit", () => {
    setNsfwTag(nsfwCheckbox.checked || parsedTags().includes("nsfw"));
  }, true);

  form.addEventListener("reset", () => {
    setTimeout(() => {
      nsfwCheckbox.checked = false;
    }, 0);
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

    // Las fichas normales quedan exactamente como siempre.
    if (!isNsfw) return;

    let badgeStack = previewWrap.querySelector(".asset-badge-stack");
    if (!badgeStack) {
      badgeStack = document.createElement("div");
      badgeStack.className = "asset-badge-stack";
      previewWrap.appendChild(badgeStack);
      badgeStack.appendChild(platform);
    }

    if (!badgeStack.querySelector(".asset-nsfw-badge")) {
      const nsfwBadge = document.createElement("span");
      nsfwBadge.className = "asset-nsfw-badge";
      nsfwBadge.textContent = "NSFW";
      badgeStack.appendChild(nsfwBadge);
    }

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "asset-preview-view-button";
    previewButton.innerHTML = "👁 <span>Ver imagen</span>";
    previewButton.title = "Mostrar imagen NSFW en esta tarjeta";
    previewButton.setAttribute("aria-pressed", "false");
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

    // Importante: NO abre modal ni agranda la imagen.
    // Solo quita/activa la censura dentro de la propia tarjeta.
    previewButton.addEventListener("click", () => {
      const revealed = card.classList.toggle("is-nsfw-revealed");
      previewButton.setAttribute("aria-pressed", String(revealed));
      previewButton.innerHTML = revealed
        ? "🙈 <span>Ocultar imagen</span>"
        : "👁 <span>Ver imagen</span>";
      previewButton.title = revealed
        ? "Volver a ocultar la imagen NSFW"
        : "Mostrar imagen NSFW en esta tarjeta";
    });
  }

  function enhanceCards() {
    grid.querySelectorAll(".asset-card").forEach(enhanceCard);
  }

  const observer = new MutationObserver(enhanceCards);
  observer.observe(grid, { childList: true });
  enhanceCards();
  syncCheckboxFromTags();
})();
