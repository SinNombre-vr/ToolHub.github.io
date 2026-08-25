(() => {
  "use strict";

  // Hotfix defensivo: elimina cualquier visor modal NSFW de versiones antiguas
  // y fuerza que "Ver imagen" solo revele/oculte la preview dentro de la tarjeta.
  function removeLegacyDialogs() {
    document.querySelectorAll(".asset-preview-dialog").forEach((dialog) => {
      try {
        if (dialog.open && typeof dialog.close === "function") dialog.close();
      } catch {}
      dialog.remove();
    });
  }

  removeLegacyDialogs();

  const dialogObserver = new MutationObserver(removeLegacyDialogs);
  dialogObserver.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".asset-preview-view-button");
    if (!button) return;

    const card = button.closest(".asset-card");
    if (!card || !card.classList.contains("is-nsfw")) return;

    // Captura antes que cualquier listener legado pueda abrir un modal.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const revealed = card.classList.toggle("is-nsfw-revealed");
    button.setAttribute("aria-pressed", String(revealed));
    button.innerHTML = revealed
      ? "🙈 <span>Ocultar imagen</span>"
      : "👁 <span>Ver imagen</span>";
    button.title = revealed
      ? "Volver a ocultar la imagen NSFW"
      : "Mostrar imagen NSFW en esta tarjeta";
  }, true);
})();
