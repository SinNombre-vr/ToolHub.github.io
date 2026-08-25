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
   ToolHub · Inicio v22
   Hero animado + primera pantalla dedicada + reveal por scroll.
   ========================================================== */
(() => {
  "use strict";

  const main = document.querySelector("body > main");
  const hero = document.querySelector("#inicio.hero");
  const quick = document.querySelector("main > .quick-access.section");
  const title = hero?.querySelector(".hero-content h1");
  const panel = hero?.querySelector(".hero-panel");
  const brand = document.querySelector(".topbar .brand");

  if (!main || !hero || !quick || !title || !panel || !brand) return;
  if (main.dataset.homeLandingV22 === "1") return;
  main.dataset.homeLandingV22 = "1";

  const intro = document.createElement("div");
  intro.className = "home-intro-stage home-intro-v22";
  hero.before(intro);
  intro.append(hero, quick);

  hero.classList.add("home-hero-v22");

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

  const revealSections = Array.from(main.children).filter((node) => node !== intro);
  revealSections.forEach((section) => section.classList.add("home-scroll-reveal-v22"));

  const style = document.createElement("style");
  style.id = "toolhub-home-v22";
  style.textContent = `
    .topbar .brand {
      gap: 12px;
      font-size: 1.28rem;
    }

    .topbar .brand-icon {
      font-size: 2.42rem;
      filter: drop-shadow(0 0 11px rgba(51, 148, 255, .18));
    }

    .home-intro-v22 {
      width: 100%;
      min-height: calc(100svh - 76px);
      display: grid;
      grid-template-rows: auto auto;
      align-content: center;
      gap: clamp(24px, 3vh, 38px);
      padding: clamp(14px, 2vh, 24px) 0 clamp(26px, 3.5vh, 42px);
      position: relative;
    }

    .home-intro-v22 > .hero {
      margin-top: 0 !important;
      min-height: auto !important;
      padding-top: clamp(46px, 5.4vh, 68px) !important;
      padding-bottom: clamp(28px, 3.8vh, 42px) !important;
    }

    .home-intro-v22 > .quick-access {
      width: min(1180px, 100%);
      margin: 0 auto;
      padding: 0 !important;
    }

    .home-intro-v22 > .quick-access .section-heading {
      width: 100%;
      justify-content: center !important;
      text-align: center !important;
      margin: 0 0 20px !important;
    }

    .home-intro-v22 > .quick-access .section-heading > div {
      width: 100%;
      text-align: center;
    }

    .home-intro-v22 > .quick-access .section-heading h2 {
      margin-left: auto;
      margin-right: auto;
    }

    .home-intro-v22 > .quick-access .quick-grid {
      width: min(1040px, 100%);
      margin: 0 auto;
      justify-content: center;
    }

    .home-intro-v22 > .quick-access .quick-card {
      min-height: 88px;
      justify-content: center;
      background: linear-gradient(145deg, rgba(13, 20, 33, .92), rgba(8, 14, 24, .84));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.02), 0 14px 34px rgba(0,0,0,.11);
    }

    .home-intro-v22 > .quick-access .quick-card:hover {
      border-color: rgba(51, 148, 255, .40);
      box-shadow: 0 18px 42px rgba(28, 100, 190, .11), inset 0 1px 0 rgba(255,255,255,.03);
    }

    .home-hero-v22 .hero-motion-title {
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

    .home-hero-v22 .hero-motion-line {
      display: block;
      width: fit-content;
      max-width: 100%;
      opacity: 0;
      color: transparent;
      background-image: linear-gradient(108deg, var(--text) 0%, var(--text) 40%, var(--hero-title-highlight) 50%, var(--text) 60%, var(--text) 100%);
      background-size: 235% 100%;
      background-position: 100% 50%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      will-change: transform, opacity, filter, background-position;
    }

    .home-hero-v22 .hero-motion-line:nth-child(1),
    .home-hero-v22 .hero-motion-line:nth-child(3) {
      transform: translate3d(-120px, 0, 0);
      filter: blur(7px);
    }

    .home-hero-v22 .hero-motion-line:nth-child(2) {
      transform: translate3d(120px, 0, 0);
      filter: blur(7px);
    }

    .home-hero-v22.home-hero-ready .hero-motion-line:nth-child(1) {
      animation: toolhub-v22-left .82s cubic-bezier(.16,1,.3,1) .10s forwards, toolhub-v22-sheen 8.5s cubic-bezier(.4,0,.2,1) 2.6s infinite;
    }

    .home-hero-v22.home-hero-ready .hero-motion-line:nth-child(2) {
      animation: toolhub-v22-right .82s cubic-bezier(.16,1,.3,1) .40s forwards, toolhub-v22-sheen 8.5s cubic-bezier(.4,0,.2,1) 2.9s infinite;
    }

    .home-hero-v22.home-hero-ready .hero-motion-line:nth-child(3) {
      animation: toolhub-v22-left .82s cubic-bezier(.16,1,.3,1) .70s forwards, toolhub-v22-sheen 8.5s cubic-bezier(.4,0,.2,1) 3.2s infinite;
    }

    @keyframes toolhub-v22-left {
      from { opacity: 0; transform: translate3d(-120px,0,0); filter: blur(7px); }
      to { opacity: 1; transform: translate3d(0,0,0); filter: blur(0); }
    }

    @keyframes toolhub-v22-right {
      from { opacity: 0; transform: translate3d(120px,0,0); filter: blur(7px); }
      to { opacity: 1; transform: translate3d(0,0,0); filter: blur(0); }
    }

    @keyframes toolhub-v22-sheen {
      0%,20% { background-position: 100% 50%; }
      48%,100% { background-position: -115% 50%; }
    }

    .home-hero-v22 .hero-panel {
      opacity: 0;
      transform: translate3d(0,16px,0) scale(.985);
      will-change: transform, opacity;
    }

    .home-hero-v22.home-hero-ready .hero-panel {
      animation: toolhub-v22-panel .66s cubic-bezier(.16,1,.3,1) 1.50s forwards;
    }

    .home-hero-v22 .hero-stat {
      position: relative;
      z-index: 2;
      opacity: 0;
      transform: translate3d(0,10px,0);
    }

    .home-hero-v22.home-hero-ready .hero-stat:nth-child(1) { animation: toolhub-v22-stat .50s cubic-bezier(.16,1,.3,1) 1.75s forwards; }
    .home-hero-v22.home-hero-ready .hero-stat:nth-child(2) { animation: toolhub-v22-stat .50s cubic-bezier(.16,1,.3,1) 1.98s forwards; }
    .home-hero-v22.home-hero-ready .hero-stat:nth-child(3) { animation: toolhub-v22-stat .50s cubic-bezier(.16,1,.3,1) 2.21s forwards; }

    @keyframes toolhub-v22-panel { to { opacity: 1; transform: translate3d(0,0,0) scale(1); } }
    @keyframes toolhub-v22-stat { to { opacity: 1; transform: translate3d(0,0,0); } }

    .home-hero-v22::after,
    .home-hero-v22 .hero-panel::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      pointer-events: none;
      background: linear-gradient(118deg, transparent 0%, transparent 31%, rgba(51,148,255,.12) 40%, rgba(63,166,255,.72) 48%, rgba(155,104,255,.55) 54%, rgba(69,225,190,.15) 60%, transparent 69%, transparent 100%) 100% 0 / 285% 285%;
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: .60;
      filter: drop-shadow(0 0 7px rgba(51,148,255,.22));
      animation: toolhub-v22-neon 8.6s linear infinite;
    }

    .home-hero-v22::after { z-index: 3; }
    .home-hero-v22 .hero-panel::before { z-index: 1; opacity: .48; animation-duration: 7.2s; animation-delay: -2s; }

    @keyframes toolhub-v22-neon {
      0% { background-position: 115% -10%; }
      25% { background-position: 80% 115%; }
      50% { background-position: -15% 105%; }
      75% { background-position: 5% -15%; }
      100% { background-position: 115% -10%; }
    }

    .home-scroll-reveal-v22 {
      opacity: 0 !important;
      visibility: hidden;
      transform: translate3d(0, 82px, 0) scale(.982);
      filter: blur(11px);
      transition: opacity .78s cubic-bezier(.16,1,.3,1), transform .92s cubic-bezier(.16,1,.3,1), filter .78s ease;
      will-change: opacity, transform, filter;
    }

    .home-scroll-reveal-v22.is-visible {
      opacity: 1 !important;
      visibility: visible;
      transform: translate3d(0,0,0) scale(1);
      filter: blur(0);
    }

    .home-scroll-reveal-v22 .category-card,
    .home-scroll-reveal-v22 .guide-card,
    .home-scroll-reveal-v22 .asset-library-home-card {
      opacity: 0;
      transform: translate3d(0,30px,0);
      transition: opacity .55s ease, transform .68s cubic-bezier(.16,1,.3,1);
    }

    .home-scroll-reveal-v22.is-visible .category-card,
    .home-scroll-reveal-v22.is-visible .guide-card,
    .home-scroll-reveal-v22.is-visible .asset-library-home-card {
      opacity: 1;
      transform: translate3d(0,0,0);
    }

    .home-scroll-reveal-v22.is-visible .category-card:nth-child(2),
    .home-scroll-reveal-v22.is-visible .guide-card:nth-child(2) { transition-delay: .08s; }
    .home-scroll-reveal-v22.is-visible .category-card:nth-child(3),
    .home-scroll-reveal-v22.is-visible .guide-card:nth-child(3) { transition-delay: .16s; }
    .home-scroll-reveal-v22.is-visible .category-card:nth-child(4),
    .home-scroll-reveal-v22.is-visible .guide-card:nth-child(4) { transition-delay: .24s; }
    .home-scroll-reveal-v22.is-visible .category-card:nth-child(5) { transition-delay: .32s; }
    .home-scroll-reveal-v22.is-visible .category-card:nth-child(6) { transition-delay: .40s; }

    @media (min-width: 1100px) and (min-height: 780px) {
      .home-intro-v22 > .hero {
        transform: translateX(-50%) scale(.955);
        transform-origin: center center;
        margin-bottom: -12px !important;
      }
    }

    @media (max-width: 960px) {
      .topbar .brand { font-size: 1.16rem; }
      .topbar .brand-icon { font-size: 2.22rem; }

      .home-intro-v22 {
        min-height: auto;
        display: flex;
        flex-direction: column;
        padding: 18px 0 74px;
      }

      .home-intro-v22 > .quick-access .section-heading,
      .home-intro-v22 > .quick-access .section-heading > div {
        text-align: left !important;
      }

      .home-intro-v22 > .quick-access .quick-card { justify-content: flex-start; }
    }

    @media (max-width: 680px) {
      .topbar .brand { font-size: 1.06rem; gap: 9px; }
      .topbar .brand-icon { font-size: 2rem; }
      .home-hero-v22 .hero-motion-line { width: auto; }
      .home-scroll-reveal-v22 { transform: translate3d(0,48px,0) scale(.99); filter: blur(6px); }
    }

    @media (min-width: 681px) {
      .home-hero-v22 .hero-motion-line { white-space: nowrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      .home-hero-v22 .hero-motion-line,
      .home-hero-v22 .hero-panel,
      .home-hero-v22 .hero-stat,
      .home-scroll-reveal-v22,
      .home-scroll-reveal-v22 .category-card,
      .home-scroll-reveal-v22 .guide-card,
      .home-scroll-reveal-v22 .asset-library-home-card {
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
        filter: none !important;
        animation: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  function startHeroAnimation() {
    if (hero.classList.contains("home-hero-ready")) return;
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("home-hero-ready")));
  }

  if (document.documentElement.classList.contains("privacy-pending")) {
    const privacyObserver = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("privacy-pending")) {
        privacyObserver.disconnect();
        startHeroAnimation();
      }
    });
    privacyObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } else {
    startHeroAnimation();
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealSections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -14% 0px",
  });

  revealSections.forEach((section) => observer.observe(section));
})();
