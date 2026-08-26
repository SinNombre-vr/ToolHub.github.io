(() => {
  "use strict";

  const STORAGE_KEY = "toolhub_language";
  const SUPPORTED = new Set(["es", "en"]);
  const ATTRS = ["placeholder", "aria-label", "title"];

  const EN = new Map(Object.entries({
    "Ir al inicio": "Go to home",
    "Abrir menú": "Open menu",
    "Navegación principal": "Main navigation",
    "Inicio": "Home",
    "Herramientas": "Tools",
    "Guías": "Guides",
    "Buscar...": "Search...",
    "Cambiar tema": "Change theme",
    "Activar tema oscuro": "Enable dark theme",
    "Activar tema claro": "Enable light theme",
    "MULTIHERRAMIENTA · GUÍAS · SOLUCIONES": "MULTITOOL · GUIDES · SOLUTIONS",
    "Todo lo que necesitas en un solo lugar.": "Everything you need in one place.",
    "Herramientas rápidas y guías prácticas para imágenes, PDF, PC, VR, Unity, VRChat y Discord.": "Fast tools and practical guides for images, PDF, PC, VR, Unity, VRChat and Discord.",
    "Ver herramientas": "View tools",
    "Explorar guías": "Explore guides",
    "Categorías de herramientas": "Tool categories",
    "Áreas principales de guías": "Main guide areas",
    "Diseño preparado para crecer": "Designed to grow",
    "ACCESO RÁPIDO": "QUICK ACCESS",
    "Empieza por aquí": "Start here",
    "Imágenes": "Images",
    "Convertir, redimensionar y comprimir.": "Convert, resize and compress.",
    "Dividir, unir y optimizar.": "Split, merge and optimize.",
    "Guías PC": "PC Guides",
    "Windows, BIOS y drivers.": "Windows, BIOS and drivers.",
    "Guías Unity": "Unity Guides",
    "Texturas, Poiyomi y materiales.": "Textures, Poiyomi and materials.",
    "HERRAMIENTAS": "TOOLS",
    "Todas las herramientas": "All tools",
    "Organizadas por categorías para encontrar lo que necesitas rápidamente.": "Organized by category so you can quickly find what you need.",
    "Conversor PNG / JPG / WEBP": "PNG / JPG / WEBP Converter",
    "Redimensionar imágenes": "Resize images",
    "Comprimir imágenes": "Compress images",
    "Generador de gradientes": "Gradient Generator",
    "Generador de MatCap": "MatCap Generator",
    "Generador de Normal Map": "Normal Map Generator",
    "Dividir PDF": "Split PDF",
    "Unir PDF": "Merge PDF",
    "Optimizar PDF": "Optimize PDF",
    "PDF a Word": "PDF to Word",
    "Editar PDF": "Edit PDF",
    "Firmar PDF": "Sign PDF",
    "Marca de agua": "Watermark",
    "Generales": "General",
    "Calculadora": "Calculator",
    "Herramientas para Discord": "Tools for Discord",
    "Abrir Top.gg en una pestaña nueva": "Open Top.gg in a new tab",
    "Bots para Discord": "Discord Bots",
    "Constructor de Embeds": "Embed Builder",
    "Generador de estructura de servidor": "Server Structure Generator",
    "Generador de roles y permisos": "Roles and Permissions Generator",
    "Checklist de seguridad para Discord": "Discord Security Checklist",
    "Herramientas para VRChat": "Tools for VRChat",
    "Oficial VRChat": "Official VRChat",
    "Herramientas para Unity": "Tools for Unity",
    "Webs de avatares y assets": "Avatar and Asset Websites",
    "Generador de Shaders": "Shader Generator",
    "GUÍAS": "GUIDES",
    "Guías y tutoriales": "Guides and tutorials",
    "Contenido organizado por tema, pensado para explicar cada proceso paso a paso.": "Content organized by topic to explain each process step by step.",
    "GUÍA VISUAL": "VISUAL GUIDE",
    "Conectividad y PCVR": "Connectivity and PCVR",
    "Cable, Air Link, Steam Link, Virtual Desktop y cómo elegir.": "Cable, Air Link, Steam Link, Virtual Desktop and how to choose.",
    "Configuración, dispositivos, rendimiento, playspace y problemas.": "Setup, devices, performance, playspace and troubleshooting.",
    "SlimeVR, VIVE/HTC, colocación, calibración y sistemas híbridos.": "SlimeVR, VIVE/HTC, placement, calibration and hybrid systems.",
    "Presets, normals, MatCap, emission, custom shaders y rendimiento.": "Presets, normals, MatCap, emission, custom shaders and performance.",
    "Shaders: crearlos y usarlos": "Shaders: creating and using them",
    "HLSL, materiales, shaders animados, rendimiento y Shader Studio.": "HLSL, materials, animated shaders, performance and Shader Studio.",
    "Interfaz de Unity y SDK": "Unity Interface and SDK",
    "No encontramos ninguna herramienta o guía con esa búsqueda.": "No tools or guides matched that search.",
    "UNITY · VRCHAT · ASSETS": "UNITY · VRCHAT · ASSETS",
    "Biblioteca de Assets VRChat": "VRChat Asset Library",
    "Organiza referencias de avatares, ropa, texturas, shaders, prefabs y recursos de Unity desde un único catálogo visual.": "Organize avatar, clothing, texture, shader, prefab and Unity resource references in one visual catalog.",
    "CATÁLOGO PERSONAL": "PERSONAL CATALOG",
    "Almacén de Assets para Unity y VRChat": "Asset Library for Unity and VRChat",
    "Crear": "Create",
    "Buscar": "Search",
    "Filtrar": "Filter",
    "Administrador": "Administrator",
    "Propietario único": "Sole owner",
    "Sobre la web": "About the website",
    "Política de privacidad": "Privacy policy",
    "Términos de uso": "Terms of use",
    "Todos los derechos reservados.": "All rights reserved.",
    "Cerrar": "Close",
    "Entendido": "Got it",
    "Aceptar": "Accept",
    "Continuar": "Continue",
    "Cancelar": "Cancel",
    "Aceptar y continuar": "Accept and continue",
    "Antes de continuar": "Before continuing",
    "PRIVACIDAD Y PROTECCIÓN DE DATOS": "PRIVACY AND DATA PROTECTION",
    "Tratamiento de PDF": "PDF processing",
    "Finalidad": "Purpose",
    "Normativa de referencia": "Applicable framework",
    "Recordatorio de aceptación": "Acceptance reminder",
    "Funciones de IA opcionales": "Optional AI features",
    "He leído y comprendido la información de privacidad y protección de datos.": "I have read and understood the privacy and data protection information.",
    "INFORMACIÓN": "INFORMATION",
    "Información": "Information",
    "SOBRE LA WEB": "ABOUT THE WEBSITE",
    "Finalidad de ToolHub": "Purpose of ToolHub",
    "POLÍTICA DE PRIVACIDAD": "PRIVACY POLICY",
    "Privacidad y protección de datos": "Privacy and data protection",
    "TÉRMINOS DE USO": "TERMS OF USE",
    "Condiciones de uso de ToolHub": "ToolHub Terms of Use",
    "INFORMACIÓN SOBRE UNITY": "UNITY INFORMATION",
    "INFORMACIÓN SOBRE VRCHAT": "VRCHAT INFORMATION",
    "INFORMACIÓN SOBRE DISCORD": "DISCORD INFORMATION",
    "Antes de utilizar estas herramientas": "Before using these tools",
    "Antes de utilizar estas recomendaciones": "Before using these recommendations",
    "Software de terceros": "Third-party software",
    "Software y paquetes de terceros": "Third-party software and packages",
    "Bots y servicios externos": "Bots and external services",
    "Copias de seguridad": "Backups",
    "Uso bajo tu criterio": "Use at your own discretion",
    "Responsabilidad": "Responsibility",
    "Responsabilidad del usuario": "User responsibility",
    "¿Qué es?": "What is it?",
    "Instalación": "Installation",
    "Funciones útiles": "Useful features",
    "Consejo:": "Tip:",
    "Importante:": "Important:",
    "Abrir ↗": "Open ↗",
    "Descargar ↗": "Download ↗",
    "Ver versión oficial ↗": "View official version ↗",
    "Abrir en Steam ↗": "Open on Steam ↗",
    "Web oficial / Streamer / Standalone ↗": "Official website / Streamer / Standalone ↗",
    "HERRAMIENTA": "TOOL",
    "GUÍA": "GUIDE",
    "HERRAMIENTA GENERAL": "GENERAL TOOL",
    "Científica": "Scientific",
    "Historial": "History",
    "Borrar": "Clear",
    "Cerrar calculadora": "Close calculator",
    "Operación matemática": "Math operation",
    "Enter = calcular · Esc = cerrar · También puedes escribir con el teclado.": "Enter = calculate · Esc = close · You can also type with the keyboard.",
    "Contenido": "Content",
    "Autor": "Author",
    "Título": "Title",
    "Descripción": "Description",
    "Color": "Color",
    "Imagen principal (URL)": "Main image (URL)",
    "Miniatura (URL)": "Thumbnail (URL)",
    "+ Añadir campo": "+ Add field",
    "Limpiar": "Clear",
    "Vista previa": "Preview",
    "Copiar JSON": "Copy JSON",
    "Descargar JSON": "Download JSON",
    "Configuración": "Configuration",
    "Nombre del servidor": "Server name",
    "Tipo": "Type",
    "Comunidad": "Community",
    "Creador / contenido": "Creator / content",
    "Estudio / proyecto": "Study / project",
    "Generar estructura": "Generate structure",
    "Resultado": "Result",
    "Copiar estructura": "Copy structure",
    "Descargar TXT": "Download TXT",
    "Nuevo rol": "New role",
    "Nombre": "Name",
    "Añadir rol": "Add role",
    "Preset base segura": "Safe base preset",
    "Jerarquía": "Hierarchy",
    "Copiar configuración": "Copy configuration",
    "Progreso": "Progress",
    "Reiniciar checklist": "Reset checklist",
    "Informe": "Report",
    "Copiar informe": "Copy report",
    "Nota:": "Note:",
    "Antes de actualizar:": "Before updating:"
  }));

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = "es";
  let observer = null;

  function canonical(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function preferredLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.has(saved)) return saved;
    } catch (_) {}

    const browserLanguage = String(navigator.language || "").toLowerCase();
    return browserLanguage.startsWith("es") ? "es" : "en";
  }

  function translatedValue(original) {
    if (language !== "en") return original;
    return EN.get(canonical(original)) ?? original;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, textarea, [data-i18n-ignore]")) return;

    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    if (!canonical(original)) return;

    const translated = translatedValue(original);
    let target = original;

    if (translated !== original) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      target = `${leading}${translated}${trailing}`;
    }

    // Critical performance guard: never write the same value back into the DOM.
    if (node.nodeValue !== target) node.nodeValue = target;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || element.matches("[data-i18n-ignore]")) return;

    let originals = originalAttrs.get(element);
    if (!originals) {
      originals = {};
      originalAttrs.set(element, originals);
    }

    for (const attr of ATTRS) {
      if (!element.hasAttribute(attr)) continue;
      if (!(attr in originals)) originals[attr] = element.getAttribute(attr);
      const target = translatedValue(originals[attr]);
      if (element.getAttribute(attr) !== target) element.setAttribute(attr, target);
    }
  }

  function translateSubtree(root) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;

    if (root instanceof Element) translateAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) translateTextNode(current);
      else if (current instanceof Element) translateAttributes(current);
      current = walker.nextNode();
    }
  }

  function updateDocumentMetadata() {
    document.documentElement.lang = language;
    document.title = language === "en" ? "ToolHub - Tools and Guides" : "ToolHub - Herramientas y Guías";

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      const target = language === "en"
        ? "Tools, guides and solutions for PC, VR, Unity, VRChat, Discord and images."
        : "Web de herramientas, guías y soluciones para PC, VR, Unity, VRChat, Discord e imágenes.";
      if (description.content !== target) description.content = target;
    }
  }

  function updateSelector() {
    document.querySelectorAll("[data-toolhub-language]").forEach((button) => {
      const active = button.dataset.toolhubLanguage === language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const group = document.getElementById("toolhubLanguageSwitcher");
    if (group) {
      group.setAttribute("aria-label", language === "en" ? "Language" : "Idioma");
      group.title = language === "en" ? "Change language" : "Cambiar idioma";
    }
  }

  function setLanguage(nextLanguage, { persist = true } = {}) {
    if (!SUPPORTED.has(nextLanguage)) return;
    language = nextLanguage;

    // One bounded pass only when the user actually changes language.
    translateSubtree(document.body);
    updateDocumentMetadata();
    updateSelector();

    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    }

    document.dispatchEvent(new CustomEvent("toolhub:languagechange", {
      detail: { language }
    }));
  }

  function injectStyles() {
    if (document.getElementById("toolhubI18nStyles")) return;
    const style = document.createElement("style");
    style.id = "toolhubI18nStyles";
    style.textContent = `
      .toolhub-language-switcher {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border: 1px solid rgba(127, 127, 127, .24);
        border-radius: 999px;
        background: rgba(127, 127, 127, .06);
        flex: 0 0 auto;
      }
      .toolhub-language-button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 6px 9px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: .04em;
        cursor: pointer;
        opacity: .62;
        transition: opacity .18s ease, background .18s ease, box-shadow .18s ease;
      }
      .toolhub-language-button:hover,
      .toolhub-language-button:focus-visible { opacity: 1; }
      .toolhub-language-button.active {
        opacity: 1;
        background: rgba(72, 135, 255, .2);
        box-shadow: inset 0 0 0 1px rgba(98, 157, 255, .32);
      }
      @media (max-width: 760px) {
        .toolhub-language-button { padding: 6px 7px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createSelector() {
    if (document.getElementById("toolhubLanguageSwitcher")) return;
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return;

    const switcher = document.createElement("div");
    switcher.id = "toolhubLanguageSwitcher";
    switcher.className = "toolhub-language-switcher";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("data-i18n-ignore", "");

    for (const code of ["es", "en"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toolhub-language-button";
      button.dataset.toolhubLanguage = code;
      button.textContent = code.toUpperCase();
      button.addEventListener("click", () => setLanguage(code));
      switcher.appendChild(button);
    }

    const searchBox = headerActions.querySelector(".search-box");
    headerActions.insertBefore(switcher, searchBox || headerActions.firstChild);
  }

  function startObserver() {
    observer = new MutationObserver((mutations) => {
      // Spanish is the original DOM, so no work is needed for newly inserted content.
      if (language !== "en") return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) translateSubtree(node);
      }
    });

    // Intentionally no characterData/attributes observation.
    // Watching our own text writes caused Firefox to enter a mutation feedback loop in v1.
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function boot() {
    injectStyles();
    createSelector();
    language = preferredLanguage();
    setLanguage(language, { persist: false });
    startObserver();

    window.ToolHubI18n = Object.freeze({
      getLanguage: () => language,
      setLanguage,
      supportedLanguages: ["es", "en"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
