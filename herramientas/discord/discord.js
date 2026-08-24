
(() => {
  "use strict";

  const openButton = document.getElementById("openDiscordInfo");
  const backdrop = document.getElementById("discordInfoBackdrop");
  const closeButton = document.getElementById("discordInfoClose");
  const okButton = document.getElementById("discordInfoOk");

  if (!openButton || !backdrop || !closeButton || !okButton) {
    return;
  }

  let previousFocus = null;

  function openDiscordInfo() {
    previousFocus = document.activeElement;

    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      closeButton.focus();
    });
  }

  function closeDiscordInfo() {
    backdrop.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  openButton.addEventListener("click", openDiscordInfo);
  closeButton.addEventListener("click", closeDiscordInfo);
  okButton.addEventListener("click", closeDiscordInfo);

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      closeDiscordInfo();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!backdrop.hidden && event.key === "Escape") {
      event.preventDefault();
      closeDiscordInfo();
    }
  });
})();
