(() => {
  "use strict";

  const scripts = [
    { src: "i18n-v2.js?v=2", attr: "data-toolhub-i18n" },
    { src: "topbar-cleanup.js?v=2", attr: "data-toolhub-topbar-cleanup" },
    { src: "script-main.js?v=24", attr: "data-toolhub-main" },
    { src: "toolhub-user.js?v=2", attr: "data-toolhub-user" },
    { src: "toolhub-account-label.js?v=1", attr: "data-toolhub-account-label" },
    { src: "herramientas/admin/toolhub-admin.js?v=1", attr: "data-toolhub-admin" },
    { src: "toolhub-tree-menu.js?v=2", attr: "data-toolhub-tree-menu" },
    { src: "toolhub-recent-assets.js?v=1", attr: "data-toolhub-recent-assets" },
    { src: "toolhub-recent-position-fix.js?v=2", attr: "data-toolhub-recent-position-fix" }
  ];

  function load(index) {
    if (index >= scripts.length) return;

    const item = scripts[index];

    if (document.querySelector(`script[${item.attr}]`)) {
      load(index + 1);
      return;
    }

    const script = document.createElement("script");
    script.src = item.src;
    script.defer = true;
    script.setAttribute(item.attr, "1");
    script.addEventListener("load", () => load(index + 1), { once: true });
    script.addEventListener("error", () => {
      console.error(`ToolHub: no se pudo cargar ${item.src}`);
    }, { once: true });
    document.body.appendChild(script);
  }

  load(0);
})();