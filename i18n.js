(() => {
  "use strict";

  const STORAGE_KEY = "toolhub_language";
  const SUPPORTED = new Set(["es", "en"]);

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
    "Abrir ↗": "Open ↗",
    "Descargar ↗": "Download ↗",
    "Ver versión oficial ↗": "View official version ↗",
    "Nota:": "Note:",
    "Cerrar": "Close",
    "Entendido": "Got it",
    "Aceptar": "Accept",
    "Continuar": "Continue",
    "Cancelar": "Cancel",
    "INFORMACIÓN SOBRE VRCHAT": "VRCHAT INFORMATION",
    "Antes de utilizar estas herramientas": "Before using these tools",
    "Software de terceros": "Third-party software",
    "Uso bajo tu criterio": "Use at your own discretion",
    "Responsabilidad": "Responsibility",
    "Descarga siempre las herramientas desde sus páginas oficiales o repositorios oficiales enlazados por ToolHub.": "Always download tools from their official websites or official repositories linked by ToolHub.",
    "¿Qué es?": "What is it?",
    "Instalación": "Installation",
    "Ten Steam y SteamVR instalados.": "Make sure Steam and SteamVR are installed.",
    "Abre OVR Advanced Settings en Steam.": "Open OVR Advanced Settings on Steam.",
    "Instálalo y ejecútalo junto a SteamVR.": "Install it and run it alongside SteamVR.",
    "Dentro de VR abre el dashboard de SteamVR y busca OVR Advanced Settings.": "In VR, open the SteamVR dashboard and find OVR Advanced Settings.",
    "Es una aplicación de overlay para SteamVR que añade ajustes y utilidades accesibles desde el dashboard de VR.": "It is a SteamVR overlay application that adds settings and utilities accessible from the VR dashboard.",
    "UNITY · VRCHAT": "UNITY · VRCHAT",
    "Unity requerido actualmente por VRChat: 2022.3.22f1": "Unity currently required by VRChat: 2022.3.22f1",
    "VRChat recomienda mantenerse en esta versión para proyectos de avatares y mundos. El Creator Companion puede instalar la versión compatible automáticamente.": "VRChat recommends staying on this version for avatar and world projects. Creator Companion can install the compatible version automatically.",
    "Herramienta oficial para crear y gestionar proyectos, SDKs y paquetes VPM.": "Official tool for creating and managing projects, SDKs and VPM packages.",
    "Conjunto de utilidades para reparación, optimización y flujo de trabajo con avatares.": "A set of utilities for avatar repair, optimization and workflow.",
    "Shader toon avanzado para avatares y proyectos VRChat.": "Advanced toon shader for avatars and VRChat projects.",
    "Shader de avatares con múltiples opciones de iluminación, máscaras y efectos.": "Avatar shader with multiple lighting, mask and effect options.",
    "Herramientas no destructivas para toggles, ropa, menús, controladores y otros sistemas de avatar.": "Non-destructive tools for toggles, clothing, menus, controllers and other avatar systems.",
    "Mejoras visuales y de calidad de vida para la jerarquía de Unity.": "Visual and quality-of-life improvements for the Unity hierarchy.",
    "Inspectores alternativos y mejoras de calidad de vida para parámetros y menús del VRCSDK.": "Alternative inspectors and quality-of-life improvements for VRCSDK parameters and menus.",
    "Prefab/sistema de VRLabs para mantener objetos en espacio de mundo mediante constraints.": "VRLabs prefab/system for keeping objects in world space using constraints.",
    "Sistema no destructivo para ropa, toggles, menús, parámetros y componentes modulares.": "Non-destructive system for clothing, toggles, menus, parameters and modular components.",
    "Configurador automatizado para setups SPS en bases compatibles.": "Automated configurator for SPS setups on compatible bases.",
    "Sistema no destructivo para vestir avatares y gestionar wearables.": "Non-destructive system for dressing avatars and managing wearables.",
    "Antes de actualizar:": "Before updating:",
    "algunos avatares dependen de versiones concretas de shaders o herramientas. Haz copia de seguridad del proyecto antes de actualizar paquetes.": "some avatars depend on specific versions of shaders or tools. Back up the project before updating packages.",
    "SOBRE LA WEB": "ABOUT THE WEBSITE",
    "Finalidad de ToolHub": "Purpose of ToolHub",
    "ToolHub es un proyecto de uso propio orientado a reunir herramientas, guías y utilidades técnicas en un único sitio.": "ToolHub is a personal project designed to bring tools, guides and technical utilities together in one place.",
    "Finalidad": "Purpose",
    "Facilitar tareas concretas relacionadas con imágenes, PDF, PC, VR, Unity, VRChat y Discord.": "Make specific tasks related to images, PDF, PC, VR, Unity, VRChat and Discord easier.",
    "Privacidad por diseño": "Privacy by design",
    "La web no está destinada al espionaje, vigilancia, seguimiento oculto ni recopilación encubierta de información de los usuarios.": "The website is not intended for spying, surveillance, hidden tracking or covert collection of user information.",
    "Archivos": "Files",
    "Las herramientas que procesen archivos se diseñan para trabajar localmente en el navegador siempre que sea técnicamente posible, evitando subir o almacenar el contenido en servidores.": "Tools that process files are designed to work locally in the browser whenever technically possible, avoiding uploading or storing content on servers.",
    "Datos locales": "Local data",
    "Se usa almacenamiento local para recordar la aceptación del aviso inicial y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap.": "Local storage is used to remember acceptance of the initial notice and, if enabled by the user, to retain MatCap Generator preference memory.",
    "IA opcional de MatCap": "Optional MatCap AI",
    "El asistente de MatCap dispone de un modo local gratuito que no envía datos y de Ollama para IA local. Solo al seleccionar OpenAI se envían a esa API el texto, los parámetros actuales y la memoria elegida. No se envían imágenes ni archivos mediante esta función.": "The MatCap assistant includes a free local mode that sends no data and Ollama for local AI. Only when OpenAI is selected are the text, current parameters and selected memory sent to that API. No images or files are sent through this feature.",
    "Si en el futuro una función necesitara enviar información a un servidor, esa función deberá indicarlo de forma clara antes de utilizarse y la política de privacidad tendrá que actualizarse.": "If a future feature needs to send information to a server, it must clearly state this before use and the privacy policy must be updated.",
    "POLÍTICA DE PRIVACIDAD": "PRIVACY POLICY",
    "Privacidad y protección de datos": "Privacy and data protection",
    "Esta política resume cómo está diseñada ToolHub para tratar la información utilizada por sus herramientas.": "This policy summarizes how ToolHub is designed to handle information used by its tools.",
    "Responsable": "Controller",
    "Principio general": "General principle",
    "La web está diseñada para evitar la recopilación innecesaria de datos personales y para limitar cada tratamiento a la función solicitada por el usuario.": "The website is designed to avoid unnecessary collection of personal data and to limit each processing activity to the function requested by the user.",
    "PDF y archivos": "PDF and files",
    "Las herramientas PDF están planteadas para procesar los documentos localmente en el navegador, sin enviarlos ni almacenarlos en servidores de ToolHub.": "PDF tools are designed to process documents locally in the browser without sending or storing them on ToolHub servers.",
    "Almacenamiento local": "Local storage",
    "Se guarda una marca en localStorage para recordar la aceptación del aviso inicial. Si el usuario activa la memoria de MatCap, también se guarda localmente un breve resumen de sus preferencias. No se almacenan imágenes ni archivos en esa memoria.": "A flag is stored in localStorage to remember acceptance of the initial notice. If the user enables MatCap memory, a brief summary of preferences is also stored locally. No images or files are stored in that memory.",
    "Servicio externo de IA": "External AI service",
    "El asistente de MatCap funciona localmente por defecto y puede usar Ollama en el propio PC. OpenAI permanece como opción externa; solo al seleccionarla se envían texto, colores, parámetros y la memoria elegida. No se envían imágenes ni archivos mediante esa función.": "The MatCap assistant works locally by default and can use Ollama on the user's PC. OpenAI remains an external option; only when selected are text, colors, parameters and selected memory sent. No images or files are sent through that feature.",
    "Normativa de referencia": "Applicable framework",
    "Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD), junto con la normativa aplicable en cada caso.": "Regulation (EU) 2016/679 (GDPR) and Organic Law 3/2018 (LOPDGDD), together with any other applicable regulations.",
    "Responsabilidad del usuario": "User responsibility",
    "Quien utilice documentos que contengan datos personales o información de terceros debe contar con autorización o con una base jurídica válida para hacerlo.": "Anyone using documents containing personal data or third-party information must have authorization or another valid legal basis to do so.",
    "Esta información describe el funcionamiento previsto de la web. Si se incorporan analítica, cuentas, servidores, formularios o servicios externos, esta política deberá revisarse antes de activar esas funciones.": "This information describes the intended operation of the website. If analytics, accounts, servers, forms or external services are added, this policy must be reviewed before those features are enabled.",
    "TÉRMINOS DE USO": "TERMS OF USE",
    "Condiciones de uso de ToolHub": "ToolHub Terms of Use",
    "Al utilizar ToolHub aceptas usar sus herramientas de forma lícita, responsable y únicamente sobre archivos o información que tengas derecho a utilizar.": "By using ToolHub, you agree to use its tools lawfully and responsibly, and only with files or information you have the right to use.",
    "Uso permitido": "Permitted use",
    "Las herramientas se ofrecen para tareas técnicas, educativas y de uso personal. No deben emplearse para acceder, modificar, vigilar o tratar información ajena sin autorización.": "The tools are provided for technical, educational and personal-use tasks. They must not be used to access, modify, monitor or process someone else's information without authorization.",
    "Archivos de terceros": "Third-party files",
    "El usuario es responsable de disponer de los permisos necesarios cuando un archivo contenga datos personales, material confidencial o contenido protegido de terceros.": "The user is responsible for having the necessary permissions when a file contains personal data, confidential material or protected third-party content.",
    "Uso prohibido": "Prohibited use",
    "No está permitido utilizar la web con fines ilícitos, abusivos, fraudulentos, de espionaje, vigilancia no autorizada o vulneración de derechos de terceros.": "The website must not be used for unlawful, abusive or fraudulent purposes, spying, unauthorized surveillance or infringement of third-party rights.",
    "Resultados": "Results",
    "Antes de sustituir o eliminar un archivo original, el usuario debe comprobar el resultado generado por la herramienta y conservar copias de seguridad cuando sea necesario.": "Before replacing or deleting an original file, the user should verify the generated result and keep backups when necessary.",
    "Propiedad": "Ownership",
    "ToolHub y su estructura pertenecen a 匚尺丨丂, salvo los nombres, marcas, bibliotecas o contenidos de terceros que conserven sus respectivos derechos.": "ToolHub and its structure belong to 匚尺丨丂, except for third-party names, trademarks, libraries or content, which retain their respective rights.",
    "Cambios": "Changes",
    "Las funciones y estas condiciones pueden actualizarse cuando cambie el funcionamiento de la web o sea necesario adaptar su información legal.": "Features and these terms may be updated when the website changes or when its legal information needs to be adapted.",
    "El usuario debe revisar especialmente los archivos sensibles antes de procesarlos y evitar utilizar información que no sea necesaria para la tarea concreta.": "Users should carefully review sensitive files before processing them and avoid using information that is not necessary for the specific task.",
    "HERRAMIENTA": "TOOL",
    "GUÍA": "GUIDE",
    "La tarjeta ya está conectada a la estructura principal. En el siguiente paso podemos programar esta herramienta para que funcione de verdad.": "This card is already connected to the main structure. The next step is to implement the tool so it works fully.",
    "La guía ya tiene su acceso preparado. Después podemos crear la página completa con contenido, secciones y navegación paso a paso.": "The guide link is ready. Next, the complete page can be built with content, sections and step-by-step navigation.",
    "Plataforma donde muchos creadores publican herramientas, assets y paquetes para Unity/VRChat.": "A platform where many creators publish tools, assets and packages for Unity/VRChat.",
    "Buscador especializado para encontrar avatares, mundos y assets de VRChat publicados en distintas tiendas.": "A specialized search engine for VRChat avatars, worlds and assets published across different stores.",
    "Marketplace de productos digitales con una categoría 3D que incluye avatares y assets para VRChat y otras plataformas.": "Digital product marketplace with a 3D category that includes avatars and assets for VRChat and other platforms.",
    "ToolHub enlaza fuentes donde el usuario debe revisar la licencia y autorización de cada asset. No se incluyen enlaces a sitios centrados en contenido ripeado o distribuido sin permiso.": "ToolHub links to sources where users must review each asset's license and authorization. Links to sites focused on ripped or unauthorized redistributed content are not included.",
    "OFICIAL VRCHAT": "OFFICIAL VRCHAT",
    "VCC compatible": "VCC compatible",
    "Instalación VCC recomendada": "VCC installation recommended",
    "LEGACY / COMUNIDAD": "LEGACY / COMMUNITY",
    "VCC recomendado": "VCC recommended"
  }));

  const ATTRS = ["placeholder", "aria-label", "title"];
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = "es";
  let observer = null;
  let applying = false;

  function canonical(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function preferredLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.has(saved)) return saved;
    } catch (error) {
      // Continue with browser language when localStorage is unavailable.
    }

    const browserLanguage = String(navigator.language || "").toLowerCase();
    return browserLanguage.startsWith("es") ? "es" : "en";
  }

  function translateValue(original) {
    if (language !== "en") return original;
    const translated = EN.get(canonical(original));
    return translated ?? original;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, textarea, [data-i18n-ignore]")) return;

    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    const compact = canonical(original);
    if (!compact) return;

    const translated = translateValue(original);
    if (translated === original) {
      node.nodeValue = original;
      return;
    }

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${translated}${trailing}`;
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
      const original = originals[attr];
      element.setAttribute(attr, translateValue(original));
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
    let current = walker.currentNode;
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
      description.content = language === "en"
        ? "Tools, guides and solutions for PC, VR, Unity, VRChat, Discord and images."
        : "Web de herramientas, guías y soluciones para PC, VR, Unity, VRChat, Discord e imágenes.";
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
    applying = true;

    translateSubtree(document.body);
    updateDocumentMetadata();
    updateSelector();

    applying = false;

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, language);
      } catch (error) {
        // The language still applies for the current session.
      }
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
        border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, currentColor 5%, transparent);
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
      .toolhub-language-button:focus-visible {
        opacity: 1;
      }
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
      if (applying) return;
      applying = true;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) translateSubtree(node);

        if (mutation.type === "characterData") {
          const node = mutation.target;
          if (!originalText.has(node)) originalText.set(node, node.nodeValue);
          translateTextNode(node);
        }
      }

      updateSelector();
      applying = false;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
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
