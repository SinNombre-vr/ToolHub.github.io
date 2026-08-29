(() => {
  "use strict";

  // Este loader se ejecuta desde biblioteca-assets-privada.html (raíz del sitio),
  // por lo que las rutas de los módulos deben apuntar explícitamente a su carpeta.
  const base = "herramientas/assets-library/";
  const scripts = [
    `${base}assets-library-private-auth2.js?v=1`,
    `${base}assets-library-private-core-v4.js?v=1`,
    `${base}assets-library-private-session-ui.js?v=1`,
    `${base}assets-library-private-admin.js?v=3`
  ];

  function load(index) {
    if (index >= scripts.length) return;

    const src = scripts[index];
    if (document.querySelector(`script[src="${src}"]`)) {
      load(index + 1);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.addEventListener("load", () => load(index + 1), { once: true });
    script.addEventListener("error", () => {
      console.error(`ToolHub privado: no se pudo cargar ${src}`);
      load(index + 1);
    }, { once: true });
    document.body.appendChild(script);
  }

  load(0);
})();
