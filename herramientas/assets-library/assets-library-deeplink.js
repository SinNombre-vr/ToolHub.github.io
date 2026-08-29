(() => {
  "use strict";

  if (window.__TOOLHUB_ASSET_DEEPLINK__) return;
  window.__TOOLHUB_ASSET_DEEPLINK__ = true;

  const params = new URLSearchParams(location.search);
  let activeId = String(params.get("asset") || "").trim();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(activeId)) activeId = "";
  if (!activeId) return;

  const grid = document.getElementById("assetGrid");
  const resultCount = document.getElementById("resultCount");
  const empty = document.getElementById("assetEmpty");
  const emptyTitle = document.getElementById("assetEmptyTitle");
  const emptyText = document.getElementById("assetEmptyText");
  const clearFilters = document.getElementById("clearFilters");
  const toolbar = document.querySelector(".asset-library-toolbar");
  if (!grid) return;

  const style = document.createElement("style");
  style.id = "toolhubAssetDeepLinkStyles";
  style.textContent = `
    .asset-card[data-deeplink-hidden="1"] { display:none !important; }
    .asset-deeplink-indicator {
      display:inline-flex;
      align-items:center;
      gap:8px;
      margin-left:auto;
      padding:7px 10px;
      border:1px solid rgba(121,184,255,.28);
      border-radius:999px;
      background:rgba(121,184,255,.08);
      color:#9bc9ff;
      font-size:.72rem;
      font-weight:800;
      white-space:nowrap;
    }
    .asset-deeplink-indicator button {
      border:0;
      background:transparent;
      color:inherit;
      font:inherit;
      cursor:pointer;
      padding:0;
    }
  `;
  document.head.appendChild(style);

  let indicator = null;
  let scrolled = false;

  function clearDeepLink() {
    if (!activeId) return;
    activeId = "";
    const url = new URL(location.href);
    url.searchParams.delete("asset");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    indicator?.remove();
    indicator = null;
    [...grid.querySelectorAll(".asset-card")].forEach((card) => {
      card.removeAttribute("data-deeplink-hidden");
    });
  }

  function ensureIndicator(name) {
    if (!toolbar || indicator) return;
    indicator = document.createElement("span");
    indicator.className = "asset-deeplink-indicator";

    const label = document.createElement("span");
    label.textContent = name ? `Mostrando: ${name}` : "Asset seleccionado";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Mostrar todos los assets");
    close.title = "Mostrar todos los assets";
    close.addEventListener("click", () => {
      clearDeepLink();
      clearFilters?.click();
    });

    indicator.append(label, close);
    toolbar.appendChild(indicator);
  }

  function applyFilter(assets = []) {
    if (!activeId) return;

    const cards = [...grid.querySelectorAll(".asset-card")];
    let matches = 0;
    let matchCard = null;

    cards.forEach((card) => {
      const match = String(card.dataset.assetId || "") === activeId;
      if (match) {
        card.removeAttribute("data-deeplink-hidden");
        matches += 1;
        matchCard = card;
      } else {
        card.dataset.deeplinkHidden = "1";
      }
    });

    const selected = Array.isArray(assets)
      ? assets.find((asset) => String(asset?.id || "") === activeId)
      : null;

    if (resultCount) resultCount.textContent = `${matches} ${matches === 1 ? "resultado" : "resultados"}`;

    if (matches) {
      if (empty) empty.hidden = true;
      ensureIndicator(selected?.name || matchCard?.querySelector(".asset-title")?.textContent?.trim() || "");
      if (!scrolled && matchCard) {
        scrolled = true;
        requestAnimationFrame(() => matchCard.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } else if (cards.length) {
      if (empty) empty.hidden = false;
      if (emptyTitle) emptyTitle.textContent = "Asset no encontrado";
      if (emptyText) emptyText.textContent = "El asset enlazado ya no está disponible o no es visible públicamente.";
      ensureIndicator("");
    }
  }

  document.addEventListener("toolhub-assets-rendered", (event) => {
    applyFilter(Array.isArray(event.detail?.assets) ? event.detail.assets : []);
  });

  const observer = new MutationObserver(() => applyFilter());
  observer.observe(grid, { childList: true });

  if (clearFilters) {
    clearFilters.addEventListener("click", () => {
      clearDeepLink();
    }, true);
  }

  if (grid.children.length) applyFilter();
})();
