
(() => {
  "use strict";

  const infoBackdrop = document.getElementById("vrchatInfoBackdrop");
  const infoOpen = document.getElementById("openVrchatInfo");
  const infoClose = document.getElementById("vrchatInfoClose");
  const infoOk = document.getElementById("vrchatInfoOk");

  const guides = {
    ovr: document.getElementById("ovrGuideBackdrop"),
    "virtual-desktop": document.getElementById("virtualDesktopGuideBackdrop"),
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
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  infoOpen?.addEventListener("click", () => openBackdrop(infoBackdrop));
  infoClose?.addEventListener("click", () => closeBackdrop(infoBackdrop));
  infoOk?.addEventListener("click", () => closeBackdrop(infoBackdrop));

  infoBackdrop?.addEventListener("click", (event) => {
    if (event.target === infoBackdrop) closeBackdrop(infoBackdrop);
  });

  document.querySelectorAll("[data-vrchat-guide]").forEach((button) => {
    button.addEventListener("click", () => openBackdrop(guides[button.dataset.vrchatGuide]));
  });

  document.querySelectorAll("[data-vrchat-close-guide]").forEach((button) => {
    button.addEventListener("click", () => closeBackdrop(guides[button.dataset.vrchatCloseGuide]));
  });

  Object.values(guides).forEach((backdrop) => {
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

    const openGuide = Object.values(guides).find((backdrop) => backdrop && !backdrop.hidden);
    if (openGuide) {
      event.preventDefault();
      closeBackdrop(openGuide);
    }
  });
})();
