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
    if (themeToggle) {
      themeToggle.textContent = body.classList.contains("light-theme") ? "☀" : "☾";
    }
  };

  updateThemeIcon();

  themeToggle?.addEventListener("click", () => {
    body.classList.toggle("light-theme");
    updateThemeIcon();

    try {
      localStorage.setItem(
        "toolhub_theme",
        body.classList.contains("light-theme") ? "light" : "dark"
      );
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
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${active}`
      );
    });
  };

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0
      ? Math.min(1, Math.max(0, window.scrollY / max))
      : 0;

    if (progress) progress.style.width = `${ratio * 100}%`;
    backTop?.classList.toggle("visible", window.scrollY > 650);
    setActiveSection();
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  backTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
})();