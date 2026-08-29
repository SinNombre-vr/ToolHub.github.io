(() => {
  "use strict";

  if (window.__TOOLHUB_RECENT_POSITION_FIX__) return;
  window.__TOOLHUB_RECENT_POSITION_FIX__ = true;

  const main = document.querySelector("main.toolhub-home-with-recent");
  const flow = document.querySelector(".toolhub-home-flow");
  const rail = document.querySelector(".toolhub-recent-rail");
  const tools = document.querySelector("#herramientas");
  const toolsHeading = tools?.querySelector(".section-heading");

  if (!main || !flow || !rail || !tools || !toolsHeading) return;

  const style = document.createElement("style");
  style.id = "toolhubRecentPositionFixStyles";
  style.textContent = `
    @media (min-width: 1321px) {
      main.toolhub-home-with-recent > .toolhub-recent-rail {
        position: static !important;
        top: auto !important;
        align-self: stretch !important;
        height: auto !important;
        min-height: 0 !important;
        margin-top: var(--toolhub-recent-offset, 86px) !important;
        margin-bottom: 0 !important;
      }
    }

    @media (max-width: 1320px) {
      .toolhub-home-flow > .toolhub-recent-rail {
        order: 4 !important;
        position: relative !important;
        top: auto !important;
        margin-top: 18px !important;
      }
    }

    @media (max-width: 720px) {
      .toolhub-home-flow > .toolhub-recent-rail {
        margin-top: 8px !important;
      }
    }
  `;
  document.head.appendChild(style);

  let frame = 0;

  function syncPosition() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const desktop = window.matchMedia("(min-width: 1321px)").matches;

      if (desktop) {
        if (rail.parentElement !== main) main.appendChild(rail);

        const mainRect = main.getBoundingClientRect();
        const headingRect = toolsHeading.getBoundingClientRect();
        const offset = Math.max(0, headingRect.bottom - mainRect.top + 18);
        main.style.setProperty("--toolhub-recent-offset", `${Math.round(offset)}px`);
        return;
      }

      main.style.removeProperty("--toolhub-recent-offset");

      if (rail.parentElement !== flow || rail.previousElementSibling !== tools) {
        tools.insertAdjacentElement("afterend", rail);
      }
    });
  }

  syncPosition();
  window.addEventListener("resize", syncPosition, { passive: true });
  window.addEventListener("load", syncPosition, { once: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(syncPosition).catch(() => {});
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(syncPosition);
    observer.observe(toolsHeading);
  }
})();