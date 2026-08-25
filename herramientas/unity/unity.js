
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


/* ==========================================================
   ToolHub · Inicio v20
   Primera impresión: logo mayor, título por líneas, estadísticas
   escalonadas y borde de luz suave. Se limita exclusivamente al
   hero de la página principal.
   ========================================================== */
(() => {
  "use strict";

  const hero = document.querySelector("#inicio.hero");
  const title = hero?.querySelector(".hero-content h1");
  const panel = hero?.querySelector(".hero-panel");
  const brand = document.querySelector(".topbar .brand");

  if (!hero || !title || !panel || !brand) return;
  if (hero.dataset.homeHeroV20 === "1") return;
  hero.dataset.homeHeroV20 = "1";
  hero.classList.add("home-hero-v20");

  const style = document.createElement("style");
  style.id = "toolhub-home-hero-v20";
  style.textContent = `
    /* Logo superior: solo un aumento moderado para darle más identidad. */
    .topbar .brand {
      gap: 12px;
      font-size: 1.24rem;
    }

    .topbar .brand-icon {
      font-size: 2.34rem;
      filter: drop-shadow(0 0 10px rgba(51, 148, 255, .16));
    }

    /* Anula el barrido antiguo aplicado al h1 completo; el acabado pasa a cada línea. */
    .home-hero-v20 .hero-motion-title {
      width: fit-content;
      max-width: 780px;
      overflow: visible;
      color: var(--text) !important;
      background: none !important;
      -webkit-background-clip: initial !important;
      background-clip: initial !important;
      -webkit-text-fill-color: currentColor !important;
      animation: none !important;
      filter: drop-shadow(0 15px 26px var(--hero-title-shadow));
    }

    .home-hero-v20 .hero-motion-line {
      display: block;
      width: fit-content;
      max-width: 100%;
      opacity: 0;
      color: transparent;
      background-image: linear-gradient(
        108deg,
        var(--text) 0%,
        var(--text) 40%,
        var(--hero-title-highlight) 50%,
        var(--text) 60%,
        var(--text) 100%
      );
      background-size: 235% 100%;
      background-position: 100% 50%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      will-change: transform, opacity, filter, background-position;
    }

    .home-hero-v20 .hero-motion-line:nth-child(1),
    .home-hero-v20 .hero-motion-line:nth-child(3) {
      transform: translate3d(-105px, 0, 0);
      filter: blur(7px);
    }

    .home-hero-v20 .hero-motion-line:nth-child(2) {
      transform: translate3d(105px, 0, 0);
      filter: blur(7px);
    }

    .home-hero-v20.home-hero-ready .hero-motion-line:nth-child(1) {
      animation:
        toolhub-title-from-left .82s cubic-bezier(.16, 1, .3, 1) .12s forwards,
        toolhub-line-sheen 8.5s cubic-bezier(.4, 0, .2, 1) 2.6s infinite;
    }

    .home-hero-v20.home-hero-ready .hero-motion-line:nth-child(2) {
      animation:
        toolhub-title-from-right .82s cubic-bezier(.16, 1, .3, 1) .42s forwards,
        toolhub-line-sheen 8.5s cubic-bezier(.4, 0, .2, 1) 2.9s infinite;
    }

    .home-hero-v20.home-hero-ready .hero-motion-line:nth-child(3) {
      animation:
        toolhub-title-from-left .82s cubic-bezier(.16, 1, .3, 1) .72s forwards,
        toolhub-line-sheen 8.5s cubic-bezier(.4, 0, .2, 1) 3.2s infinite;
    }

    @keyframes toolhub-title-from-left {
      0% {
        opacity: 0;
        transform: translate3d(-105px, 0, 0);
        filter: blur(7px);
      }
      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        filter: blur(0);
      }
    }

    @keyframes toolhub-title-from-right {
      0% {
        opacity: 0;
        transform: translate3d(105px, 0, 0);
        filter: blur(7px);
      }
      100% {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        filter: blur(0);
      }
    }

    @keyframes toolhub-line-sheen {
      0%, 20% { background-position: 100% 50%; }
      48%, 100% { background-position: -115% 50%; }
    }

    /* El panel aparece una vez que las tres líneas ya están colocadas. */
    .home-hero-v20 .hero-panel {
      opacity: 0;
      transform: translate3d(0, 15px, 0) scale(.988);
      will-change: transform, opacity;
    }

    .home-hero-v20.home-hero-ready .hero-panel {
      animation: toolhub-stats-panel-in .68s cubic-bezier(.16, 1, .3, 1) 1.55s forwards;
    }

    .home-hero-v20 .hero-stat {
      position: relative;
      z-index: 2;
      opacity: 0;
      transform: translate3d(0, 9px, 0);
      will-change: transform, opacity;
    }

    .home-hero-v20.home-hero-ready .hero-stat:nth-child(1) {
      animation: toolhub-stat-in .52s cubic-bezier(.16, 1, .3, 1) 1.78s forwards;
    }

    .home-hero-v20.home-hero-ready .hero-stat:nth-child(2) {
      animation: toolhub-stat-in .52s cubic-bezier(.16, 1, .3, 1) 2.00s forwards;
    }

    .home-hero-v20.home-hero-ready .hero-stat:nth-child(3) {
      animation: toolhub-stat-in .52s cubic-bezier(.16, 1, .3, 1) 2.22s forwards;
    }

    @keyframes toolhub-stats-panel-in {
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes toolhub-stat-in {
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    /* Luz de borde: el elemento queda recortado al borde, nunca cruza el contenido. */
    .home-hero-v20::after,
    .home-hero-v20 .hero-panel::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      pointer-events: none;
      background:
        linear-gradient(
          118deg,
          transparent 0%,
          transparent 30%,
          rgba(51, 148, 255, .12) 39%,
          rgba(63, 166, 255, .72) 48%,
          rgba(155, 104, 255, .55) 53%,
          rgba(69, 225, 190, .16) 59%,
          transparent 69%,
          transparent 100%
        ) 100% 0 / 285% 285%;
      -webkit-mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: .62;
      filter: drop-shadow(0 0 7px rgba(51, 148, 255, .24));
      animation: toolhub-neon-border-walk 8.8s linear infinite;
    }

    .home-hero-v20::after {
      z-index: 3;
    }

    .home-hero-v20 .hero-panel::before {
      z-index: 1;
      opacity: .50;
      animation-duration: 7.4s;
      animation-delay: -2.2s;
      filter: drop-shadow(0 0 6px rgba(155, 104, 255, .20));
    }

    @keyframes toolhub-neon-border-walk {
      0%   { background-position: 115% -10%; }
      25%  { background-position: 80% 115%; }
      50%  { background-position: -15% 105%; }
      75%  { background-position: 5% -15%; }
      100% { background-position: 115% -10%; }
    }

    .light-theme .home-hero-v20::after,
    .light-theme .home-hero-v20 .hero-panel::before {
      opacity: .38;
      filter: drop-shadow(0 0 5px rgba(51, 118, 195, .16));
    }

    @media (max-width: 960px) {
      .topbar .brand {
        font-size: 1.16rem;
      }

      .topbar .brand-icon {
        font-size: 2.2rem;
      }
    }

    @media (max-width: 680px) {
      .topbar .brand {
        font-size: 1.06rem;
        gap: 9px;
      }

      .topbar .brand-icon {
        font-size: 2rem;
      }

      .home-hero-v20 .hero-motion-line {
        width: auto;
      }
    }

    @media (min-width: 681px) {
      .home-hero-v20 .hero-motion-line {
        white-space: nowrap;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-hero-v20 .hero-motion-line,
      .home-hero-v20 .hero-panel,
      .home-hero-v20 .hero-stat {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
        animation: none !important;
      }

      .home-hero-v20::after,
      .home-hero-v20 .hero-panel::before {
        animation: none !important;
        background-position: 50% 50%;
      }
    }
  `;
  document.head.appendChild(style);

  const lines = ["Todo lo que", "necesitas en un", "solo lugar."];
  title.classList.add("hero-motion-title");
  title.setAttribute("aria-label", "Todo lo que necesitas en un solo lugar.");
  title.replaceChildren(...lines.map((text) => {
    const line = document.createElement("span");
    line.className = "hero-motion-line";
    line.setAttribute("aria-hidden", "true");
    line.textContent = text;
    return line;
  }));

  function startHeroAnimation() {
    if (hero.classList.contains("home-hero-ready")) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => hero.classList.add("home-hero-ready"));
    });
  }

  /* En primera visita esperamos a que el aviso de privacidad desaparezca,
     para que la animación sea realmente la primera impresión visible. */
  if (document.documentElement.classList.contains("privacy-pending")) {
    const privacyObserver = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("privacy-pending")) {
        privacyObserver.disconnect();
        startHeroAnimation();
      }
    });
    privacyObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  } else {
    startHeroAnimation();
  }
})();
