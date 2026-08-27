(() => {
  "use strict";

  const topbar = document.querySelector(".topbar");
  const headerActions = document.querySelector(".header-actions");
  if (!topbar || !headerActions) return;

  topbar.classList.add("toolhub-topbar-clean");

  if (!document.getElementById("toolhubTopbarCleanupStyles")) {
    const style = document.createElement("style");
    style.id = "toolhubTopbarCleanupStyles";
    style.textContent = `
      .topbar.toolhub-topbar-clean {
        grid-template-columns: auto 1fr auto !important;
      }

      .topbar.toolhub-topbar-clean .header-actions {
        grid-column: 3 !important;
        justify-self: end !important;
        width: auto !important;
        padding-bottom: 0 !important;
      }

      .topbar.toolhub-topbar-clean .main-nav,
      .topbar.toolhub-topbar-clean .menu-toggle,
      .topbar.toolhub-topbar-clean .toolhub-obsolete-search,
      .topbar.toolhub-topbar-clean #themeToggle,
      .topbar.toolhub-topbar-clean .site-like-button {
        display: none !important;
      }

      @media (max-width: 960px) {
        .topbar.toolhub-topbar-clean {
          grid-template-columns: auto 1fr auto !important;
          gap: 18px;
        }
      }

      @media (max-width: 680px) {
        .topbar.toolhub-topbar-clean {
          grid-template-columns: auto 1fr auto !important;
          gap: 12px;
          padding: 0 16px;
        }

        .topbar.toolhub-topbar-clean .header-actions {
          grid-column: 3 !important;
          width: auto !important;
          padding-bottom: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const searchBox = document.querySelector(".search-box");
  const themeToggle = document.getElementById("themeToggle");

  // El buscador debe seguir existiendo unos instantes para que script-main.js
  // pueda inicializar sin errores, pero se le retira la clase que usa el módulo
  // antiguo de "Me gusta". Así ese botón ya no llega a crearse.
  if (searchBox) {
    searchBox.classList.remove("search-box");
    searchBox.classList.add("toolhub-obsolete-search");
    searchBox.hidden = true;
  }

  [menuToggle, mainNav, themeToggle].forEach((element) => {
    if (element) element.hidden = true;
  });

  // ToolHub queda fijado al tema oscuro actual.
  document.body.classList.remove("light-theme");

  // Elimina la preferencia local de una función que ya no existe.
  try {
    localStorage.removeItem("toolhub_site_like_v1");
  } catch (_) {}

  let observer = null;

  function finalizeCleanup() {
    document.querySelector(".site-like-button")?.remove();

    // El candado privado se inserta después de #themeToggle. Esperamos a que
    // exista para no interferir con su inicialización y después retiramos del
    // DOM todos los controles obsoletos.
    if (!document.getElementById("toolhubAdminLock")) return;

    menuToggle?.remove();
    mainNav?.remove();
    searchBox?.remove();
    themeToggle?.remove();
    observer?.disconnect();
  }

  observer = new MutationObserver(finalizeCleanup);
  observer.observe(headerActions, { childList: true, subtree: true });

  queueMicrotask(finalizeCleanup);
  setTimeout(finalizeCleanup, 4000);
})();
