
(() => {
  "use strict";

  const infoBackdrop = document.getElementById("unityInfoBackdrop");
  const infoOpen = document.getElementById("openUnityInfo");
  const infoClose = document.getElementById("unityInfoClose");
  const infoOk = document.getElementById("unityInfoOk");

  const popups = {
    webs: document.getElementById("unityWebsBackdrop"),
    tools: document.getElementById("unityToolsBackdrop"),
  };

  let previousFocus = null;

  function openBackdrop(backdrop) {
    if (!backdrop) return;
    previousFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => backdrop.querySelector(".modal-close")?.focus());
  }

  function closeBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.hidden = true;
    document.body.style.overflow = "";
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  infoOpen?.addEventListener("click", () => openBackdrop(infoBackdrop));
  infoClose?.addEventListener("click", () => closeBackdrop(infoBackdrop));
  infoOk?.addEventListener("click", () => closeBackdrop(infoBackdrop));

  infoBackdrop?.addEventListener("click", (event) => {
    if (event.target === infoBackdrop) closeBackdrop(infoBackdrop);
  });

  document.querySelectorAll("[data-unity-popup]").forEach((button) => {
    button.addEventListener("click", () => openBackdrop(popups[button.dataset.unityPopup]));
  });

  document.querySelectorAll("[data-unity-close]").forEach((button) => {
    button.addEventListener("click", () => closeBackdrop(popups[button.dataset.unityClose]));
  });

  Object.values(popups).forEach((backdrop) => {
    backdrop?.addEventListener("click", (event) => {
      if (event.target === backdrop) closeBackdrop(backdrop);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (infoBackdrop && !infoBackdrop.hidden) {
      event.preventDefault();
      closeBackdrop(infoBackdrop);
      return;
    }

    const opened = Object.values(popups).find(
      (backdrop) => backdrop && !backdrop.hidden
    );

    if (opened) {
      event.preventDefault();
      closeBackdrop(opened);
    }
  });
})();
