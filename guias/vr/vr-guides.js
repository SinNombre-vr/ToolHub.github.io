(() => {
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const progress = document.querySelector(".guide-progress > span");
  const backTop = document.getElementById("backTop");

  try {
    if (localStorage.getItem("toolhub_theme") === "light") {
      body.classList.add("light-theme");
    }
  } catch (_) {}

  const updateThemeIcon = () => {
    if (themeToggle) themeToggle.textContent = body.classList.contains("light-theme") ? "☀" : "☾";
  };
  updateThemeIcon();

  themeToggle?.addEventListener("click", () => {
    body.classList.toggle("light-theme");
    updateThemeIcon();
    try {
      localStorage.setItem("toolhub_theme", body.classList.contains("light-theme") ? "light" : "dark");
    } catch (_) {}
  });

  menuToggle?.addEventListener("click", () => {
    const open = mainNav?.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.querySelectorAll(".accordion-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".accordion-item");
      const open = item.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  const sections = [...document.querySelectorAll(".guide-section[id]")];
  const tocLinks = [...document.querySelectorAll(".guide-toc a[href^='#']")];

  const setActiveSection = () => {
    let active = sections[0]?.id;
    const marker = window.scrollY + 170;
    sections.forEach((section) => {
      if (section.offsetTop <= marker) active = section.id;
    });
    tocLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${active}`);
    });
  };

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.width = `${ratio * 100}%`;
    backTop?.classList.toggle("visible", window.scrollY > 650);
    setActiveSection();
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  backTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const visorText = {
    quest: {
      title: "Quest 2 / 3 / Pro",
      text: "Tienes varias rutas PCVR: conexión por USB/Quest Link o streaming inalámbrico mediante Air Link, Steam Link o una solución de terceros como Virtual Desktop. Si vas por Wi‑Fi, prioriza que el PC esté conectado al router por Ethernet y que el visor use una banda rápida y poco congestionada."
    },
    native: {
      title: "Valve Index / VIVE cableado",
      text: "Normalmente la ruta más directa es el enlace de vídeo nativo del visor más SteamVR. Aquí importan especialmente los puertos de vídeo correctos, USB, seguimiento Lighthouse y una configuración de resolución/frecuencia que tu GPU pueda sostener."
    },
    standalone: {
      title: "PICO / HTC standalone",
      text: "Estos visores pueden ofrecer streaming PCVR mediante aplicaciones compatibles del fabricante, Steam Link en modelos admitidos o soluciones de terceros. Comprueba la compatibilidad exacta de tu modelo antes de configurar."
    },
    other: {
      title: "Otro visor",
      text: "Empieza por identificar si tu visor es PCVR nativo o standalone. Después comprueba qué runtime utiliza, qué conexión admite y si trabaja directamente con SteamVR o necesita una aplicación puente."
    }
  };

  const visorResult = document.getElementById("visorResult");
  document.querySelectorAll("[data-visor]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-visor]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      const data = visorText[button.dataset.visor];
      if (visorResult && data) {
        visorResult.innerHTML = `<strong>${data.title}</strong><p>${data.text}</p>`;
      }
    });
  });

  const trackerSets = {
    "5": {
      active: ["chest","lthigh","rthigh","lankle","rankle"],
      title: "5 trackers · base de cuerpo",
      text: "Pecho, muslo izquierdo/derecho y pierna inferior/tobillo izquierdo/derecho. Es una configuración mínima muy habitual en SlimeVR para estimar la parte inferior del cuerpo."
    },
    "6": {
      active: ["chest","hip","lthigh","rthigh","lankle","rankle"],
      title: "6 trackers · añade cadera",
      text: "Pecho, cadera, ambos muslos y ambas piernas inferiores. La cadera añade una referencia directa del centro del cuerpo."
    },
    "8": {
      active: ["chest","hip","lthigh","rthigh","lankle","rankle","lfoot","rfoot"],
      title: "8 trackers · pies incluidos",
      text: "Añade seguimiento de ambos pies al conjunto de 6. Resulta útil para representar mejor orientación y movimiento de los pies."
    },
    "10": {
      active: ["chest","hip","larm","rarm","lthigh","rthigh","lankle","rankle","lfoot","rfoot"],
      title: "10 trackers · brazos + pies",
      text: "Pecho, cadera, brazos superiores, muslos, piernas inferiores y pies. Amplía el seguimiento hacia la parte superior del cuerpo."
    }
  };

  const trackerTitle = document.getElementById("trackerSetTitle");
  const trackerText = document.getElementById("trackerSetText");

  function applyTrackerSet(key) {
    const config = trackerSets[key];
    if (!config) return;
    document.querySelectorAll(".tracker-dot").forEach((dot) => {
      dot.classList.toggle("active", config.active.includes(dot.dataset.part));
    });
    document.querySelectorAll("[data-trackers]").forEach((b) => {
      b.classList.toggle("active", b.dataset.trackers === key);
    });
    if (trackerTitle) trackerTitle.textContent = config.title;
    if (trackerText) trackerText.textContent = config.text;
  }

  document.querySelectorAll("[data-trackers]").forEach((button) => {
    button.addEventListener("click", () => applyTrackerSet(button.dataset.trackers));
  });

  if (document.querySelector("[data-trackers='6']")) applyTrackerSet("6");

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
})();