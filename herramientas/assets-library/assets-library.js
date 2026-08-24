(() => {
  "use strict";

  const core = document.createElement("script");
  core.src = "herramientas/assets-library/assets-library-core.js";
  core.onload = () => {
    const publicCreate = document.createElement("script");
    publicCreate.src = "herramientas/assets-library/assets-public-create.js";
    document.head.appendChild(publicCreate);
  };
  core.onerror = () => console.error("No se pudo cargar el núcleo de la Biblioteca de Assets.");
  document.head.appendChild(core);
})();
