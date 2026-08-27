(() => {
  "use strict";

  if (window.__TOOLHUB_TREE_MENU__) return;
  window.__TOOLHUB_TREE_MENU__ = true;

  const brand = document.querySelector(".topbar .brand");
  if (!brand) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { open: false, root: "tools", branch: null };

  const copy = {
    es: {
      title: "Menú de ToolHub",
      subtitle: "Elige una sección y abre su rama.",
      tools: "Todas las herramientas",
      guides: "Guías y tutoriales",
      assets: "Almacén de assets",
      private: "Almacén privado",
      choose: "Selecciona una categoría",
      back: "Volver",
      close: "Cerrar menú"
    },
    en: {
      title: "ToolHub menu",
      subtitle: "Choose a section and open its branch.",
      tools: "All tools",
      guides: "Guides & tutorials",
      assets: "Asset library",
      private: "Private library",
      choose: "Choose a category",
      back: "Back",
      close: "Close menu"
    }
  };

  const lang = () => window.ToolHubI18n?.getLanguage?.() === "en" ? "en" : "es";
  const t = (key) => copy[lang()][key] || copy.es[key] || key;

  const style = document.createElement("style");
  style.id = "toolhubTreeMenuStyles";
  style.textContent = `
    .topbar .brand { cursor:pointer; user-select:none; }
    .topbar .brand[aria-expanded="true"] .brand-icon { filter:drop-shadow(0 0 8px rgba(51,148,255,.75)); }
    .toolhub-tree-menu {
      position:fixed; top:76px; left:0; right:0; z-index:12000;
      padding:18px 5vw 24px; border-bottom:1px solid rgba(72,122,190,.18);
      background:linear-gradient(180deg,rgba(6,11,20,.99),rgba(8,13,24,.965));
      box-shadow:0 26px 70px rgba(0,0,0,.38); backdrop-filter:blur(18px);
      animation:toolhub-tree-in .22s cubic-bezier(.16,1,.3,1);
    }
    .toolhub-tree-menu[hidden] { display:none; }
    @keyframes toolhub-tree-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
    .toolhub-tree-inner { width:min(1220px,100%); margin:0 auto; }
    .toolhub-tree-head { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px; }
    .toolhub-tree-head h2 { margin:0 0 4px;font-size:1.1rem;letter-spacing:-.02em; }
    .toolhub-tree-head p { margin:0;color:var(--muted);font-size:.84rem; }
    .toolhub-tree-close { width:38px;height:38px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--muted);cursor:pointer;font-size:1.35rem; }
    .toolhub-tree-roots { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px; }
    .toolhub-tree-root {
      min-width:0;padding:14px 10px 12px;border:1px solid var(--border);border-radius:16px;
      background:linear-gradient(145deg,rgba(15,24,39,.96),rgba(8,14,25,.92));color:var(--text);
      cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
    }
    .toolhub-tree-root:hover,.toolhub-tree-root.active { transform:translateY(-2px);border-color:rgba(51,148,255,.48);box-shadow:0 12px 34px rgba(0,0,0,.22),0 0 22px rgba(51,148,255,.07); }
    .toolhub-tree-root.private:hover,.toolhub-tree-root.private.active { border-color:rgba(255,82,98,.5);box-shadow:0 12px 34px rgba(0,0,0,.22),0 0 22px rgba(255,60,80,.07); }
    .toolhub-tree-orb {
      width:66px;height:66px;border-radius:50%;overflow:hidden;display:grid;place-items:center;
      border:1px solid rgba(62,157,255,.5);background:#07101c;box-shadow:inset 0 0 18px rgba(41,148,255,.12),0 0 16px rgba(41,148,255,.1);
    }
    .toolhub-tree-root.private .toolhub-tree-orb { border-color:rgba(255,78,92,.45);box-shadow:inset 0 0 18px rgba(255,55,75,.08),0 0 16px rgba(255,55,75,.08); }
    .toolhub-tree-orb img { width:100%;height:100%;display:block;object-fit:cover; }
    .toolhub-tree-root strong { font-size:.84rem;line-height:1.25; }
    .toolhub-tree-branch { margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:16px;background:rgba(10,16,28,.74); }
    .toolhub-tree-branch[hidden] { display:none; }
    .toolhub-tree-branch-head { display:flex;align-items:center;gap:10px;margin-bottom:12px; }
    .toolhub-tree-back { border:1px solid var(--border);background:var(--panel);color:var(--muted);border-radius:9px;padding:7px 10px;cursor:pointer;font-weight:750; }
    .toolhub-tree-branch h3 { margin:0;font-size:.92rem; }
    .toolhub-tree-nodes { display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px; }
    .toolhub-tree-node {
      min-height:96px;padding:10px 8px;border:1px solid var(--border);border-radius:14px;background:var(--bg-soft);color:var(--text);
      cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;
      transition:transform .16s ease,border-color .16s ease,background .16s ease;
    }
    .toolhub-tree-node:hover,.toolhub-tree-node.active { transform:translateY(-1px);border-color:rgba(71,153,255,.42);background:rgba(16,27,45,.96); }
    .toolhub-tree-node-icon { width:42px;height:42px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(71,153,255,.25);background:rgba(51,148,255,.07);font-size:1.12rem; }
    .toolhub-tree-node span:last-child { font-size:.77rem;line-height:1.25;font-weight:760; }
    .toolhub-tree-leaves { margin-top:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px; }
    .toolhub-tree-leaves[hidden] { display:none; }
    .toolhub-tree-leaf { min-height:42px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);cursor:pointer;text-align:left;font-size:.78rem;font-weight:700;line-height:1.3; }
    .toolhub-tree-leaf:hover { border-color:rgba(70,151,255,.42);background:var(--blue-soft); }
    .toolhub-tree-leaf.external::after { content:" ↗";color:var(--blue); }
    @media (max-width:900px) {
      .toolhub-tree-menu { padding:14px 18px 20px;max-height:calc(100vh - 76px);overflow:auto; }
      .toolhub-tree-roots { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .toolhub-tree-nodes { grid-template-columns:repeat(3,minmax(0,1fr)); }
      .toolhub-tree-leaves { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
    @media (max-width:560px) {
      .toolhub-tree-root { padding:10px 7px; }
      .toolhub-tree-orb { width:54px;height:54px; }
      .toolhub-tree-nodes { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .toolhub-tree-leaves { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement("div");
  menu.className = "toolhub-tree-menu";
  menu.id = "toolhubTreeMenu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="toolhub-tree-inner">
      <div class="toolhub-tree-head">
        <div><h2></h2><p></p></div>
        <button class="toolhub-tree-close" type="button">×</button>
      </div>
      <div class="toolhub-tree-roots"></div>
      <div class="toolhub-tree-branch" hidden>
        <div class="toolhub-tree-branch-head"><button class="toolhub-tree-back" type="button">← <span></span></button><h3></h3></div>
        <div class="toolhub-tree-nodes"></div>
        <div class="toolhub-tree-leaves" hidden></div>
      </div>
    </div>`;
  document.body.appendChild(menu);

  const roots = $(".toolhub-tree-roots", menu);
  const branch = $(".toolhub-tree-branch", menu);
  const branchTitle = $(".toolhub-tree-branch h3", menu);
  const nodes = $(".toolhub-tree-nodes", menu);
  const leaves = $(".toolhub-tree-leaves", menu);
  const close = $(".toolhub-tree-close", menu);
  const back = $(".toolhub-tree-back", menu);

  const rootDefs = [
    { key: "tools", private: false },
    { key: "guides", private: false },
    { key: "assets", private: false },
    { key: "private", private: true }
  ];

  function iconFor(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("imagen") || value.includes("image")) return "🖼️";
    if (value.includes("pdf")) return "📄";
    if (value.includes("general")) return "🧮";
    if (value.includes("discord")) return "💬";
    if (value.includes("vrchat") || value === "vr") return "🥽";
    if (value.includes("unity")) return "🎮";
    if (value.includes("pc")) return "🖥️";
    if (value.includes("asset")) return "📦";
    return "⬡";
  }

  function cardsFrom(rootSelector, cardSelector, titleSelector, leafSelector) {
    const root = $(rootSelector);
    if (!root) return [];
    return $$(cardSelector, root).map((card) => {
      const title = $(titleSelector, card)?.textContent.trim() || "Sección";
      return {
        title,
        icon: $(".card-icon", card)?.textContent.trim() || iconFor(title),
        leaves: $$(leafSelector, card).map((element) => ({
          title: element.textContent.replace(/↗/g, "").trim(),
          element,
          href: element.tagName === "A" ? element.getAttribute("href") : null,
          target: element.tagName === "A" ? element.getAttribute("target") : null
        }))
      };
    }).filter((item) => item.leaves.length);
  }

  function dataFor(type) {
    if (type === "tools") return cardsFrom("#herramientas", ".category-card", "h3", "li a, li button");
    if (type === "guides") return cardsFrom("#guias", ".guide-card", "h3", "a, button");
    if (type === "assets") {
      return [{
        title: lang() === "en" ? "Asset library" : "Biblioteca de Assets",
        icon: "📦",
        leaves: [{
          title: $("#asset-library .asset-library-home-card h3")?.textContent.trim() || t("assets"),
          href: "biblioteca-assets.html",
          target: null,
          element: null
        }]
      }];
    }
    return [{
      title: lang() === "en" ? "Private access" : "Acceso privado",
      icon: "🔐",
      leaves: [{
        title: lang() === "en" ? "Open private asset library" : "Abrir almacén privado de Assets",
        href: "biblioteca-assets-privada.html",
        target: null,
        element: null
      }]
    }];
  }

  function renderText() {
    $(".toolhub-tree-head h2", menu).textContent = t("title");
    $(".toolhub-tree-head p", menu).textContent = t("subtitle");
    $(".toolhub-tree-back span", menu).textContent = t("back");
    close.setAttribute("aria-label", t("close"));
  }

  function renderRoots() {
    roots.innerHTML = "";
    rootDefs.forEach((def) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `toolhub-tree-root${def.private ? " private" : ""}${state.root === def.key ? " active" : ""}`;
      button.innerHTML = `<span class="toolhub-tree-orb"><img src="assets/toolhub-menu-logo.webp" alt=""></span><strong>${t(def.key)}</strong>`;
      button.addEventListener("click", () => {
        state.root = def.key;
        state.branch = null;
        renderRoots();
        renderBranch();
      });
      roots.appendChild(button);
    });
  }

  function activateLeaf(leaf) {
    closeMenu();
    if (leaf.element) {
      if (leaf.element.tagName === "A" && leaf.href) {
        if (leaf.target === "_blank") window.open(leaf.href, "_blank", "noopener,noreferrer");
        else window.location.href = leaf.href;
      } else {
        leaf.element.click();
      }
      return;
    }
    if (leaf.href) window.location.href = leaf.href;
  }

  function renderLeaves(item) {
    leaves.innerHTML = "";
    item.leaves.forEach((leaf) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `toolhub-tree-leaf${leaf.target === "_blank" ? " external" : ""}`;
      button.textContent = leaf.title;
      button.addEventListener("click", () => activateLeaf(leaf));
      leaves.appendChild(button);
    });
    leaves.hidden = false;
  }

  function renderBranch() {
    const data = dataFor(state.root);
    branch.hidden = false;
    nodes.innerHTML = "";
    leaves.innerHTML = "";
    leaves.hidden = true;
    branchTitle.textContent = t("choose");

    data.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toolhub-tree-node";
      button.innerHTML = `<span class="toolhub-tree-node-icon">${item.icon || iconFor(item.title)}</span><span>${item.title}</span>`;
      button.addEventListener("click", () => {
        state.branch = item;
        branchTitle.textContent = item.title;
        $$(".toolhub-tree-node", nodes).forEach((node) => node.classList.toggle("active", node === button));
        renderLeaves(item);
      });
      nodes.appendChild(button);
    });

    if (data.length === 1) {
      state.branch = data[0];
      branchTitle.textContent = data[0].title;
      $(".toolhub-tree-node", nodes)?.classList.add("active");
      renderLeaves(data[0]);
    }
  }

  function openMenu() {
    state.open = true;
    menu.hidden = false;
    brand.setAttribute("aria-expanded", "true");
    renderText();
    renderRoots();
    renderBranch();
  }

  function closeMenu() {
    state.open = false;
    menu.hidden = true;
    brand.setAttribute("aria-expanded", "false");
  }

  brand.setAttribute("role", "button");
  brand.setAttribute("aria-controls", menu.id);
  brand.setAttribute("aria-expanded", "false");
  brand.title = lang() === "en" ? "Open ToolHub menu" : "Abrir menú de ToolHub";
  brand.addEventListener("click", (event) => {
    event.preventDefault();
    state.open ? closeMenu() : openMenu();
  });

  close.addEventListener("click", closeMenu);
  back.addEventListener("click", () => {
    state.branch = null;
    renderBranch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!state.open) return;
    if (menu.contains(event.target) || brand.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("toolhub:languagechange", () => {
    brand.title = lang() === "en" ? "Open ToolHub menu" : "Abrir menú de ToolHub";
    renderText();
    renderRoots();
    if (state.open) renderBranch();
  });
})();