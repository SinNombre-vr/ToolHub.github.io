(() => {
  "use strict";

  const scripts = [
    ["script-main.js?v=24", "toolhubMain"],
    ["herramientas/admin/toolhub-admin.js?v=1", "toolhubAdmin"]
  ];

  function load(index) {
    if (index >= scripts.length) return;
    const [src, marker] = scripts[index];

    if (document.querySelector(`script[data-${marker}]`)) {
      load(index + 1);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[marker] = "1";
    script.addEventListener("load", () => load(index + 1), { once: true });
    script.addEventListener("error", () => {
      console.error(`ToolHub: no se pudo cargar ${src}`);
    }, { once: true });
    document.body.appendChild(script);
  }

  load(0);
})();
