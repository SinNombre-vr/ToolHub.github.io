(() => {
  "use strict";

  const scripts = [
    "assets-library-private-core.js?v=2",
    "assets-library-private-admin.js?v=2"
  ];

  function load(index) {
    if (index >= scripts.length) return;
    const script = document.createElement("script");
    script.src = scripts[index];
    script.addEventListener("load", () => load(index + 1), { once: true });
    script.addEventListener("error", () => {
      console.error(`ToolHub privado: no se pudo cargar ${scripts[index]}`);
    }, { once: true });
    document.body.appendChild(script);
  }

  load(0);
})();
