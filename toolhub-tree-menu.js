(() => {
  "use strict";

  if (window.__TOOLHUB_TREE_MENU__) return;
  window.__TOOLHUB_TREE_MENU__ = true;

  const topbar = document.querySelector(".topbar");
  const brand = document.querySelector(".topbar .brand");
  if (!topbar || !brand) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const state = {
    open: false,
    root: "tools",
    selectedIndex: 0,
    closeTimer: null
  };

  const copy = {
    es: {
      trigger: "Todas las categorías",
      menuTitle: "Todas las categorías",
      menuSubtitle: "Explora ToolHub por secciones y abre una categoría para ver sus opciones.",
      sections: "Secciones",
      categories: "Categorías",
      tools: "Herramientas",
      guides: "Guías y tutoriales",
      assets: "Assets",
      private: "Privado",
      back: "Volver a categorías",
      close: "Cerrar menú",
      empty: "No hay opciones disponibles en esta categoría.",
      choose: "Selecciona una categoría",
      option: "opción",
      options: "opciones"
    },
    en: {
      trigger: "All categories",
      menuTitle: "All categories",
      menuSubtitle: "Browse ToolHub by section and open a category to see its options.",
      sections: "Sections",
      categories: "Categories",
      tools: "Tools",
      guides: "Guides & tutorials",
      assets: "Assets",
      private: "Private",
      back: "Back to categories",
      close: "Close menu",
      empty: "There are no options available in this category.",
      choose: "Choose a category",
      option: "option",
      options: "options"
    }
  };

  const lang = () => window.ToolHubI18n?.getLanguage?.() === "en" ? "en" : "es";
  const t = (key) => copy[lang()][key] || copy.es[key] || key;

  function iconFor(text) {
    const value = normalize(text).toLowerCase();
    if (value.includes("imagen") || value.includes("image")) return "🖼️";
    if (value.includes("pdf")) return "📄";
    if (value.includes("general")) return "🧮";
    if (value.includes("discord")) return "💬";
    if (value.includes("vrchat") || value === "vr") return "🥽";
    if (value.includes("unity")) return "🎮";
    if (value.includes("pc")) return "🖥️";
    if (value.includes("asset")) return "📦";
    if (value.includes("priv")) return "🔐";
    return "⬡";
  }

  function cardsFrom(rootSelector, cardSelector, titleSelector, leafSelector) {
    const root = $(rootSelector);
    if (!root) return [];

    return $$(cardSelector, root)
      .map((card) => {
        const title = normalize($(titleSelector, card)?.textContent) || "Sección";
        const icon = normalize($(".card-icon", card)?.textContent) || iconFor(title);

        const leaves = $$(leafSelector, card)
          .map((element) => {
            const leafTitle = normalize(element.textContent.replace(/↗/g, ""));
            if (!leafTitle) return null;

            return {
              title: leafTitle,
              element,
              href: element.tagName === "A" ? element.getAttribute("href") : null,
              target: element.tagName === "A" ? element.getAttribute("target") : null
            };
          })
          .filter(Boolean);

        return { title, icon, leaves };
      })
      .filter((item) => item.leaves.length);
  }

  function dataFor(type) {
    if (type === "tools") {
      return cardsFrom("#herramientas", ".category-card", "h3", "li a, li button");
    }

    if (type === "guides") {
      return cardsFrom("#guias", ".guide-card", "h3", "a, button");
    }

    if (type === "assets") {
      return [{
        title: lang() === "en" ? "Asset library" : "Biblioteca de Assets",
        icon: "📦",
        leaves: [{
          title: lang() === "en" ? "Open asset library" : "Abrir biblioteca de Assets",
          href: "biblioteca-assets.html",
          target: null,
          element: null
        }]
      }];
    }

    return [{
      title: lang() === "en" ? "Private asset library" : "Almacén privado de Assets",
      icon: "🔐",
      leaves: [{
        title: lang() === "en" ? "Open private asset library" : "Abrir almacén privado de Assets",
        href: "biblioteca-assets-privada.html",
        target: null,
        element: null
      }]
    }];
  }

  const style = document.createElement("style");
  style.id = "toolhubMegaMenuStyles";
  style.textContent = `
    .toolhub-menu-cluster {
      display:flex;
      align-items:center;
      gap:14px;
      min-width:0;
    }

    .toolhub-menu-cluster .brand {
      flex:0 0 auto;
    }

    .toolhub-mega-trigger {
      height:42px;
      padding:0 14px;
      border:1px solid rgba(75,145,235,.24);
      border-radius:12px;
      background:rgba(9,16,28,.78);
      color:var(--text);
      display:inline-flex;
      align-items:center;
      gap:10px;
      cursor:pointer;
      font:inherit;
      font-size:.82rem;
      font-weight:760;
      letter-spacing:-.01em;
      transition:border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
    }

    .toolhub-mega-trigger:hover,
    .toolhub-mega-trigger[aria-expanded="true"] {
      border-color:rgba(63,154,255,.58);
      background:rgba(13,24,41,.96);
      box-shadow:0 0 24px rgba(51,148,255,.09);
    }

    .toolhub-mega-trigger:active {
      transform:scale(.98);
    }

    .toolhub-mega-trigger-bars {
      width:19px;
      height:14px;
      position:relative;
      display:inline-block;
      flex:0 0 19px;
    }

    .toolhub-mega-trigger-bars span {
      position:absolute;
      left:0;
      width:19px;
      height:2px;
      border-radius:999px;
      background:currentColor;
      transform-origin:center;
      transition:top .22s cubic-bezier(.2,.8,.2,1), transform .22s cubic-bezier(.2,.8,.2,1), opacity .16s ease;
    }

    .toolhub-mega-trigger-bars span:nth-child(1) { top:0; }
    .toolhub-mega-trigger-bars span:nth-child(2) { top:6px; }
    .toolhub-mega-trigger-bars span:nth-child(3) { top:12px; }

    .toolhub-mega-trigger[aria-expanded="true"] .toolhub-mega-trigger-bars span:nth-child(1) {
      top:6px;
      transform:rotate(45deg);
    }

    .toolhub-mega-trigger[aria-expanded="true"] .toolhub-mega-trigger-bars span:nth-child(2) {
      opacity:0;
      transform:scaleX(.25);
    }

    .toolhub-mega-trigger[aria-expanded="true"] .toolhub-mega-trigger-bars span:nth-child(3) {
      top:6px;
      transform:rotate(-45deg);
    }

    .toolhub-mega-shell {
      position:fixed;
      inset:76px 0 0;
      z-index:11980;
      pointer-events:none;
    }

    .toolhub-mega-shell[hidden] {
      display:none;
    }

    .toolhub-mega-backdrop {
      position:absolute;
      inset:0;
      background:rgba(0,0,0,.58);
      opacity:0;
      transition:opacity .22s ease;
      backdrop-filter:blur(3px);
    }

    .toolhub-mega-menu {
      position:absolute;
      inset:0 auto 0 0;
      width:min(1040px, calc(100vw - 34px));
      background:
        radial-gradient(circle at 78% 2%, rgba(42,118,214,.10), transparent 34%),
        linear-gradient(180deg, rgba(7,12,21,.995), rgba(8,14,24,.99));
      border-right:1px solid rgba(73,128,198,.22);
      box-shadow:28px 0 80px rgba(0,0,0,.42);
      transform:translateX(-26px);
      opacity:0;
      transition:transform .24s cubic-bezier(.16,1,.3,1), opacity .18s ease;
      display:flex;
      flex-direction:column;
      overflow:hidden;
    }

    .toolhub-mega-shell.is-open {
      pointer-events:auto;
    }

    .toolhub-mega-shell.is-open .toolhub-mega-backdrop {
      opacity:1;
    }

    .toolhub-mega-shell.is-open .toolhub-mega-menu {
      transform:none;
      opacity:1;
    }

    .toolhub-mega-head {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:18px;
      padding:24px 28px 18px;
      border-bottom:1px solid rgba(74,123,187,.15);
    }

    .toolhub-mega-head h2 {
      margin:0;
      font-size:1.42rem;
      letter-spacing:-.035em;
    }

    .toolhub-mega-head p {
      margin:5px 0 0;
      max-width:650px;
      color:var(--muted);
      font-size:.82rem;
      line-height:1.55;
    }

    .toolhub-mega-close {
      width:40px;
      height:40px;
      flex:0 0 40px;
      border:1px solid var(--border);
      border-radius:12px;
      background:rgba(14,22,36,.82);
      color:var(--text);
      cursor:pointer;
      font-size:1.35rem;
      line-height:1;
      transition:border-color .18s ease, background .18s ease, transform .18s ease;
    }

    .toolhub-mega-close:hover {
      border-color:rgba(73,157,255,.48);
      background:rgba(20,31,49,.96);
      transform:rotate(4deg);
    }

    .toolhub-mega-roots-wrap {
      padding:14px 28px 16px;
      border-bottom:1px solid rgba(74,123,187,.12);
    }

    .toolhub-mega-kicker {
      display:block;
      margin-bottom:9px;
      color:var(--muted);
      font-size:.68rem;
      font-weight:800;
      letter-spacing:.1em;
      text-transform:uppercase;
    }

    .toolhub-mega-roots {
      display:flex;
      gap:8px;
      overflow-x:auto;
      scrollbar-width:none;
    }

    .toolhub-mega-roots::-webkit-scrollbar {
      display:none;
    }

    .toolhub-mega-root {
      flex:0 0 auto;
      min-height:36px;
      padding:0 13px;
      border:1px solid var(--border);
      border-radius:999px;
      background:rgba(12,20,33,.72);
      color:var(--muted);
      cursor:pointer;
      font:inherit;
      font-size:.75rem;
      font-weight:760;
      transition:border-color .17s ease, color .17s ease, background .17s ease, box-shadow .17s ease;
    }

    .toolhub-mega-root:hover {
      color:var(--text);
      border-color:rgba(67,145,239,.4);
    }

    .toolhub-mega-root.active {
      color:#f4f8ff;
      border-color:rgba(58,150,255,.62);
      background:linear-gradient(135deg, rgba(38,124,229,.22), rgba(12,24,42,.92));
      box-shadow:0 0 20px rgba(49,143,255,.08);
    }

    .toolhub-mega-root.private.active {
      border-color:rgba(255,79,98,.48);
      background:linear-gradient(135deg, rgba(187,48,70,.16), rgba(23,16,26,.92));
      box-shadow:0 0 20px rgba(255,62,87,.06);
    }

    .toolhub-mega-body {
      min-height:0;
      flex:1 1 auto;
      display:grid;
      grid-template-columns:340px minmax(0,1fr);
      overflow:hidden;
    }

    .toolhub-mega-categories {
      min-height:0;
      overflow:auto;
      padding:22px 18px 28px 28px;
      border-right:1px solid rgba(74,123,187,.14);
      background:rgba(7,13,23,.54);
    }

    .toolhub-mega-category-list {
      display:flex;
      flex-direction:column;
      gap:5px;
    }

    .toolhub-mega-category {
      width:100%;
      min-height:48px;
      padding:8px 11px;
      border:1px solid transparent;
      border-radius:11px;
      background:transparent;
      color:var(--text);
      cursor:pointer;
      display:grid;
      grid-template-columns:34px minmax(0,1fr) 18px;
      align-items:center;
      gap:10px;
      text-align:left;
      font:inherit;
      transition:border-color .16s ease, background .16s ease, transform .16s ease;
    }

    .toolhub-mega-category:hover {
      background:rgba(21,32,49,.66);
      border-color:rgba(70,129,201,.18);
    }

    .toolhub-mega-category.active {
      background:linear-gradient(90deg, rgba(46,128,225,.15), rgba(17,28,45,.78));
      border-color:rgba(56,146,252,.34);
    }

    .toolhub-mega-category-icon {
      width:32px;
      height:32px;
      border-radius:9px;
      display:grid;
      place-items:center;
      border:1px solid rgba(66,145,240,.18);
      background:rgba(49,137,239,.07);
      font-size:.95rem;
    }

    .toolhub-mega-category strong {
      min-width:0;
      font-size:.8rem;
      line-height:1.28;
      font-weight:760;
    }

    .toolhub-mega-category-arrow {
      color:var(--muted);
      font-size:1.12rem;
      line-height:1;
      transform:translateX(0);
      transition:transform .16s ease, color .16s ease;
    }

    .toolhub-mega-category:hover .toolhub-mega-category-arrow,
    .toolhub-mega-category.active .toolhub-mega-category-arrow {
      color:var(--blue);
      transform:translateX(2px);
    }

    .toolhub-mega-detail {
      min-width:0;
      min-height:0;
      overflow:auto;
      padding:22px 28px 34px;
      background:
        linear-gradient(180deg, rgba(12,19,31,.36), transparent 34%),
        rgba(8,14,24,.72);
    }

    .toolhub-mega-back {
      display:none;
      margin:0 0 16px;
      border:1px solid var(--border);
      border-radius:10px;
      background:rgba(12,20,33,.8);
      color:var(--muted);
      min-height:36px;
      padding:0 11px;
      font:inherit;
      font-size:.75rem;
      font-weight:760;
      cursor:pointer;
    }

    .toolhub-mega-detail-head {
      display:flex;
      align-items:center;
      gap:12px;
      padding-bottom:16px;
      border-bottom:1px solid rgba(72,122,190,.13);
    }

    .toolhub-mega-detail-icon {
      width:46px;
      height:46px;
      border-radius:13px;
      display:grid;
      place-items:center;
      border:1px solid rgba(65,148,245,.25);
      background:rgba(49,136,239,.08);
      font-size:1.18rem;
      flex:0 0 46px;
    }

    .toolhub-mega-detail-head h3 {
      margin:0;
      font-size:1.15rem;
      letter-spacing:-.025em;
    }

    .toolhub-mega-detail-head small {
      display:block;
      margin-top:3px;
      color:var(--muted);
      font-size:.72rem;
    }

    .toolhub-mega-leaves {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:9px;
      margin-top:16px;
    }

    .toolhub-mega-leaf {
      min-height:48px;
      padding:10px 12px;
      border:1px solid rgba(76,126,190,.16);
      border-radius:11px;
      background:rgba(12,20,33,.68);
      color:var(--text);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      text-align:left;
      cursor:pointer;
      font:inherit;
      font-size:.77rem;
      font-weight:700;
      line-height:1.35;
      transition:border-color .16s ease, background .16s ease, transform .16s ease, box-shadow .16s ease;
    }

    .toolhub-mega-leaf:hover {
      border-color:rgba(65,150,255,.42);
      background:rgba(18,30,49,.94);
      transform:translateY(-1px);
      box-shadow:0 8px 22px rgba(0,0,0,.13);
    }

    .toolhub-mega-leaf-mark {
      color:var(--blue);
      font-size:.95rem;
      flex:0 0 auto;
    }

    .toolhub-mega-empty {
      margin:16px 0 0;
      color:var(--muted);
      font-size:.8rem;
    }

    body.toolhub-menu-open {
      overflow:hidden;
    }

    @media (max-width:900px) {
      .toolhub-mega-menu {
        width:min(860px, calc(100vw - 18px));
      }

      .toolhub-mega-body {
        grid-template-columns:290px minmax(0,1fr);
      }

      .toolhub-mega-head,
      .toolhub-mega-roots-wrap {
        padding-left:20px;
        padding-right:20px;
      }

      .toolhub-mega-categories {
        padding-left:20px;
      }

      .toolhub-mega-detail {
        padding-right:20px;
      }

      .toolhub-mega-leaves {
        grid-template-columns:1fr;
      }
    }

    @media (max-width:760px) {
      .toolhub-menu-cluster {
        gap:10px;
      }

      .toolhub-mega-trigger {
        width:42px;
        padding:0;
        justify-content:center;
      }

      .toolhub-mega-trigger-label {
        display:none;
      }

      .toolhub-mega-shell {
        inset:68px 0 0;
      }

      .toolhub-mega-menu {
        width:100vw;
        border-right:0;
      }

      .toolhub-mega-head {
        padding:18px 18px 14px;
      }

      .toolhub-mega-head h2 {
        font-size:1.18rem;
      }

      .toolhub-mega-head p {
        font-size:.76rem;
      }

      .toolhub-mega-roots-wrap {
        padding:12px 18px 13px;
      }

      .toolhub-mega-body {
        display:block;
        position:relative;
      }

      .toolhub-mega-categories,
      .toolhub-mega-detail {
        position:absolute;
        inset:0;
        border-right:0;
        padding:18px;
        transition:transform .22s cubic-bezier(.16,1,.3,1), opacity .18s ease;
      }

      .toolhub-mega-categories {
        transform:none;
        opacity:1;
      }

      .toolhub-mega-detail {
        transform:translateX(24px);
        opacity:0;
        pointer-events:none;
      }

      .toolhub-mega-shell.mobile-detail .toolhub-mega-categories {
        transform:translateX(-24px);
        opacity:0;
        pointer-events:none;
      }

      .toolhub-mega-shell.mobile-detail .toolhub-mega-detail {
        transform:none;
        opacity:1;
        pointer-events:auto;
      }

      .toolhub-mega-back {
        display:inline-flex;
        align-items:center;
      }

      .toolhub-mega-category {
        min-height:52px;
      }
    }

    @media (max-width:430px) {
      .toolhub-menu-cluster .brand-text {
        font-size:.92rem;
      }

      .toolhub-mega-head p {
        display:none;
      }

      .toolhub-mega-head {
        align-items:center;
      }

      .toolhub-mega-root {
        padding:0 11px;
      }
    }
  `;
  document.head.appendChild(style);

  const cluster = document.createElement("div");
  cluster.className = "toolhub-menu-cluster";
  brand.parentNode.insertBefore(cluster, brand);
  cluster.appendChild(brand);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "toolhub-mega-trigger";
  trigger.id = "toolhubMegaTrigger";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.innerHTML = `
    <span class="toolhub-mega-trigger-bars" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
    <span class="toolhub-mega-trigger-label"></span>
  `;
  cluster.appendChild(trigger);

  const shell = document.createElement("div");
  shell.className = "toolhub-mega-shell";
  shell.id = "toolhubMegaShell";
  shell.hidden = true;
  shell.innerHTML = `
    <div class="toolhub-mega-backdrop" data-menu-close></div>
    <section class="toolhub-mega-menu" role="dialog" aria-modal="true" aria-labelledby="toolhubMegaTitle">
      <div class="toolhub-mega-head">
        <div>
          <h2 id="toolhubMegaTitle"></h2>
          <p></p>
        </div>
        <button class="toolhub-mega-close" type="button" data-menu-close>×</button>
      </div>

      <div class="toolhub-mega-roots-wrap">
        <span class="toolhub-mega-kicker" data-label="sections"></span>
        <div class="toolhub-mega-roots" role="tablist"></div>
      </div>

      <div class="toolhub-mega-body">
        <aside class="toolhub-mega-categories">
          <span class="toolhub-mega-kicker" data-label="categories"></span>
          <div class="toolhub-mega-category-list"></div>
        </aside>

        <section class="toolhub-mega-detail" aria-live="polite">
          <button class="toolhub-mega-back" type="button">← <span></span></button>
          <div class="toolhub-mega-detail-head">
            <span class="toolhub-mega-detail-icon">⬡</span>
            <div>
              <h3></h3>
              <small></small>
            </div>
          </div>
          <div class="toolhub-mega-leaves"></div>
          <p class="toolhub-mega-empty" hidden></p>
        </section>
      </div>
    </section>
  `;
  document.body.appendChild(shell);

  trigger.setAttribute("aria-controls", shell.id);

  const rootDefs = [
    { key: "tools", private: false },
    { key: "guides", private: false },
    { key: "assets", private: false },
    { key: "private", private: true }
  ];

  const roots = $(".toolhub-mega-roots", shell);
  const categoryList = $(".toolhub-mega-category-list", shell);
  const detail = $(".toolhub-mega-detail", shell);
  const detailIcon = $(".toolhub-mega-detail-icon", detail);
  const detailTitle = $(".toolhub-mega-detail-head h3", detail);
  const detailSmall = $(".toolhub-mega-detail-head small", detail);
  const leaves = $(".toolhub-mega-leaves", detail);
  const empty = $(".toolhub-mega-empty", detail);
  const back = $(".toolhub-mega-back", detail);

  function currentData() {
    return dataFor(state.root);
  }

  function renderText() {
    $(".toolhub-mega-trigger-label", trigger).textContent = t("trigger");
    trigger.setAttribute("aria-label", t("trigger"));
    $("#toolhubMegaTitle", shell).textContent = t("menuTitle");
    $(".toolhub-mega-head p", shell).textContent = t("menuSubtitle");
    $('[data-label="sections"]', shell).textContent = t("sections");
    $('[data-label="categories"]', shell).textContent = t("categories");
    $(".toolhub-mega-close", shell).setAttribute("aria-label", t("close"));
    back.querySelector("span").textContent = t("back");
    empty.textContent = t("empty");
  }

  function renderRoots() {
    roots.innerHTML = "";

    rootDefs.forEach((def) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `toolhub-mega-root${def.private ? " private" : ""}${state.root === def.key ? " active" : ""}`;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", state.root === def.key ? "true" : "false");
      button.textContent = t(def.key);

      button.addEventListener("click", () => {
        if (state.root === def.key) return;
        state.root = def.key;
        state.selectedIndex = 0;
        shell.classList.remove("mobile-detail");
        renderRoots();
        renderCategories();
      });

      roots.appendChild(button);
    });
  }

  function renderCategories() {
    const data = currentData();
    categoryList.innerHTML = "";

    if (!data.length) {
      state.selectedIndex = -1;
      renderDetail(null);
      return;
    }

    if (state.selectedIndex < 0 || state.selectedIndex >= data.length) {
      state.selectedIndex = 0;
    }

    data.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `toolhub-mega-category${index === state.selectedIndex ? " active" : ""}`;
      button.setAttribute("aria-current", index === state.selectedIndex ? "true" : "false");

      const icon = document.createElement("span");
      icon.className = "toolhub-mega-category-icon";
      icon.textContent = item.icon || iconFor(item.title);

      const label = document.createElement("strong");
      label.textContent = item.title;

      const arrow = document.createElement("span");
      arrow.className = "toolhub-mega-category-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";

      button.append(icon, label, arrow);

      button.addEventListener("click", () => {
        state.selectedIndex = index;
        $$(".toolhub-mega-category", categoryList).forEach((node, nodeIndex) => {
          const active = nodeIndex === index;
          node.classList.toggle("active", active);
          node.setAttribute("aria-current", active ? "true" : "false");
        });
        renderDetail(item);
        if (window.matchMedia("(max-width: 760px)").matches) {
          shell.classList.add("mobile-detail");
        }
      });

      categoryList.appendChild(button);
    });

    renderDetail(data[state.selectedIndex]);
  }

  function activateLeaf(leaf) {
    closeMenu(false);

    if (leaf.element) {
      if (leaf.element.tagName === "A" && leaf.href) {
        if (leaf.target === "_blank") {
          window.open(leaf.href, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = leaf.href;
        }
      } else {
        leaf.element.click();
      }
      return;
    }

    if (leaf.href) {
      if (leaf.target === "_blank") {
        window.open(leaf.href, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = leaf.href;
      }
    }
  }

  function renderDetail(item) {
    leaves.innerHTML = "";
    empty.hidden = true;

    if (!item) {
      detailIcon.textContent = "⬡";
      detailTitle.textContent = t("choose");
      detailSmall.textContent = "";
      empty.hidden = false;
      return;
    }

    detailIcon.textContent = item.icon || iconFor(item.title);
    detailTitle.textContent = item.title;
    detailSmall.textContent = `${item.leaves.length} ${item.leaves.length === 1 ? t("option") : t("options")}`;

    if (!item.leaves.length) {
      empty.hidden = false;
      return;
    }

    item.leaves.forEach((leaf) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toolhub-mega-leaf";

      const label = document.createElement("span");
      label.textContent = leaf.title;

      const mark = document.createElement("span");
      mark.className = "toolhub-mega-leaf-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = leaf.target === "_blank" ? "↗" : "›";

      button.append(label, mark);
      button.addEventListener("click", () => activateLeaf(leaf));
      leaves.appendChild(button);
    });
  }

  function openMenu() {
    if (state.closeTimer) {
      clearTimeout(state.closeTimer);
      state.closeTimer = null;
    }

    state.open = true;
    shell.hidden = false;
    shell.classList.remove("mobile-detail");
    document.body.classList.add("toolhub-menu-open");
    trigger.setAttribute("aria-expanded", "true");
    renderText();
    renderRoots();
    renderCategories();

    requestAnimationFrame(() => {
      shell.classList.add("is-open");
      $(".toolhub-mega-close", shell)?.focus({ preventScroll: true });
    });
  }

  function closeMenu(returnFocus = true) {
    if (!state.open && shell.hidden) return;

    state.open = false;
    shell.classList.remove("is-open", "mobile-detail");
    document.body.classList.remove("toolhub-menu-open");
    trigger.setAttribute("aria-expanded", "false");

    if (state.closeTimer) clearTimeout(state.closeTimer);
    state.closeTimer = setTimeout(() => {
      shell.hidden = true;
      state.closeTimer = null;
    }, 240);

    if (returnFocus) {
      trigger.focus({ preventScroll: true });
    }
  }

  trigger.addEventListener("click", () => {
    state.open ? closeMenu() : openMenu();
  });

  $$("[data-menu-close]", shell).forEach((element) => {
    element.addEventListener("click", () => closeMenu());
  });

  back.addEventListener("click", () => {
    shell.classList.remove("mobile-detail");
    $(".toolhub-mega-category.active", categoryList)?.focus({ preventScroll: true });
  });

  brand.addEventListener("click", () => {
    if (state.open) closeMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) {
      event.preventDefault();
      closeMenu();
    }
  });

  document.addEventListener("toolhub:languagechange", () => {
    renderText();
    renderRoots();
    renderCategories();
  });

  renderText();
})();