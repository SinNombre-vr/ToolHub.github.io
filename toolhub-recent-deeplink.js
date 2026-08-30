(() => {
  "use strict";

  // Compatibilidad: los títulos de "Recién subido" ya generan su deep-link
  // directamente desde los renderizadores principales. Este archivo se conserva
  // para no romper cachés antiguas que todavía intenten cargarlo.
  const allLink = document.querySelector(".toolhub-recent-all");
  if (allLink) allLink.href = "biblioteca-assets.html";
})();