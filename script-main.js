const searchInput = document.getElementById("siteSearch");
const searchableCards = [...document.querySelectorAll("[data-search]")];
const noResults = document.getElementById("noResults");

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const navLinks = [...document.querySelectorAll(".nav-link")];
const themeToggle = document.getElementById("themeToggle");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalOk = document.getElementById("modalOk");
const modalTitle = document.getElementById("modalTitle");
const modalType = document.getElementById("modalType");
const modalText = document.getElementById("modalText");

const pdfPrivacyBackdrop = document.getElementById("pdfPrivacyBackdrop");
const pdfPrivacyContinue = document.getElementById("pdfPrivacyContinue");
const pdfPrivacyCheck = document.getElementById("pdfPrivacyCheck");

const infoModalBackdrop = document.getElementById("infoModalBackdrop");
const infoModalClose = document.getElementById("infoModalClose");
const infoModalOk = document.getElementById("infoModalOk");
const infoModalEyebrow = document.getElementById("infoModalEyebrow");
const infoModalTitle = document.getElementById("infoModalTitle");
const infoModalBody = document.getElementById("infoModalBody");

const PRIVACY_STORAGE_KEY = "toolhub_privacy_notice_v1";

const pageRegions = [
  document.querySelector(".topbar"),
  document.querySelector("main"),
  document.querySelector(".footer"),
].filter(Boolean);

let privacyAccepted = false;

document.getElementById("currentYear").textContent = new Date().getFullYear();

function hasStoredPrivacyAcceptance() {
  try {
    return localStorage.getItem(PRIVACY_STORAGE_KEY) === "accepted";
  } catch (error) {
    return false;
  }
}

function storePrivacyAcceptance() {
  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, "accepted");
  } catch (error) {
    // Si el navegador bloquea el almacenamiento local, la web seguirá funcionando,
    // pero el aviso podrá volver a aparecer en una visita posterior.
  }
}

function setPageLocked(locked) {
  document.body.classList.toggle("privacy-locked", locked);
  document.body.style.overflow = locked ? "hidden" : "";

  pageRegions.forEach((region) => {
    if (locked) {
      region.setAttribute("inert", "");
      region.setAttribute("aria-hidden", "true");
    } else {
      region.removeAttribute("inert");
      region.removeAttribute("aria-hidden");
    }
  });
}

function lockPageForPrivacy() {
  privacyAccepted = false;
  pdfPrivacyBackdrop.hidden = false;
  pdfPrivacyCheck.checked = false;
  pdfPrivacyContinue.disabled = true;
  document.documentElement.classList.add("privacy-pending");
  setPageLocked(true);
  requestAnimationFrame(() => pdfPrivacyCheck.focus());
}

function unlockPageAfterPrivacy() {
  privacyAccepted = true;
  pdfPrivacyBackdrop.hidden = true;
  document.documentElement.classList.remove("privacy-pending");
  setPageLocked(false);
}

function acceptPrivacy() {
  if (!pdfPrivacyCheck.checked) return;

  storePrivacyAcceptance();
  unlockPageAfterPrivacy();
  document.querySelector(".brand")?.focus();
}

// El aviso solo aparece la primera vez en este navegador/perfil.
if (hasStoredPrivacyAcceptance()) {
  unlockPageAfterPrivacy();
} else {
  lockPageForPrivacy();
}

pdfPrivacyCheck.addEventListener("change", () => {
  pdfPrivacyContinue.disabled = !pdfPrivacyCheck.checked;
});

pdfPrivacyContinue.addEventListener("click", acceptPrivacy);

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function handleSearch() {
  const query = normalizeText(searchInput.value.trim());
  let visibleCount = 0;

  searchableCards.forEach((card) => {
    const haystack = normalizeText(`${card.dataset.search} ${card.textContent}`);
    const matches = query === "" || haystack.includes(query);

    card.classList.toggle("search-hidden", !matches);
    card.classList.toggle("search-match", query !== "" && matches);

    if (matches) visibleCount++;
  });

  noResults.hidden = query === "" || visibleCount > 0;
}

searchInput.addEventListener("input", handleSearch);

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");

  const lightEnabled = document.body.classList.contains("light-theme");
  themeToggle.textContent = lightEnabled ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    lightEnabled ? "Activar tema oscuro" : "Activar tema claro"
  );
});

function openModal(title, type) {
  modalTitle.textContent = title;
  modalType.textContent = type;

  modalText.textContent =
    type === "HERRAMIENTA"
      ? "La tarjeta ya está conectada a la estructura principal. En el siguiente paso podemos programar esta herramienta para que funcione de verdad."
      : "La guía ya tiene su acceso preparado. Después podemos crear la página completa con contenido, secciones y navegación paso a paso.";

  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
}

const infoModalContent = {
  about: {
    eyebrow: "SOBRE LA WEB",
    title: "Finalidad de ToolHub",
    html: `
      <p>
        ToolHub es un proyecto de uso propio orientado a reunir herramientas, guías y utilidades técnicas en un único sitio.
      </p>
      <dl class="privacy-details">
        <div>
          <dt>Finalidad</dt>
          <dd>Facilitar tareas concretas relacionadas con imágenes, PDF, PC, VR, Unity, VRChat y Discord.</dd>
        </div>
        <div>
          <dt>Privacidad por diseño</dt>
          <dd>La web no está destinada al espionaje, vigilancia, seguimiento oculto ni recopilación encubierta de información de los usuarios.</dd>
        </div>
        <div>
          <dt>Archivos</dt>
          <dd>Las herramientas que procesen archivos se diseñan para trabajar localmente en el navegador siempre que sea técnicamente posible, evitando subir o almacenar el contenido en servidores.</dd>
        </div>
        <div>
          <dt>Datos locales</dt>
          <dd>Se usa almacenamiento local para recordar la aceptación del aviso inicial y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap.</dd>
        </div>
        <div>
          <dt>IA opcional de MatCap</dt>
          <dd>El asistente de MatCap dispone de un modo local gratuito que no envía datos y de Ollama para IA local. Solo al seleccionar OpenAI se envían a esa API el texto, los parámetros actuales y la memoria elegida. No se envían imágenes ni archivos mediante esta función.</dd>
        </div>
      </dl>
      <p class="privacy-warning">
        Si en el futuro una función necesitara enviar información a un servidor, esa función deberá indicarlo de forma clara antes de utilizarse y la política de privacidad tendrá que actualizarse.
      </p>
    `,
  },
  privacy: {
    eyebrow: "POLÍTICA DE PRIVACIDAD",
    title: "Privacidad y protección de datos",
    html: `
      <p>
        Esta política resume cómo está diseñada ToolHub para tratar la información utilizada por sus herramientas.
      </p>
      <dl class="privacy-details">
        <div>
          <dt>Responsable</dt>
          <dd>匚尺丨丂.</dd>
        </div>
        <div>
          <dt>Principio general</dt>
          <dd>La web está diseñada para evitar la recopilación innecesaria de datos personales y para limitar cada tratamiento a la función solicitada por el usuario.</dd>
        </div>
        <div>
          <dt>PDF y archivos</dt>
          <dd>Las herramientas PDF están planteadas para procesar los documentos localmente en el navegador, sin enviarlos ni almacenarlos en servidores de ToolHub.</dd>
        </div>
        <div>
          <dt>Almacenamiento local</dt>
          <dd>Se guarda una marca en localStorage para recordar la aceptación del aviso inicial. Si el usuario activa la memoria de MatCap, también se guarda localmente un breve resumen de sus preferencias. No se almacenan imágenes ni archivos en esa memoria.</dd>
        </div>
        <div>
          <dt>Servicio externo de IA</dt>
          <dd>El asistente de MatCap funciona localmente por defecto y puede usar Ollama en el propio PC. OpenAI permanece como opción externa; solo al seleccionarla se envían texto, colores, parámetros y la memoria elegida. No se envían imágenes ni archivos mediante esa función.</dd>
        </div>
        <div>
          <dt>Normativa de referencia</dt>
          <dd>Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD), junto con la normativa aplicable en cada caso.</dd>
        </div>
        <div>
          <dt>Responsabilidad del usuario</dt>
          <dd>Quien utilice documentos que contengan datos personales o información de terceros debe contar con autorización o con una base jurídica válida para hacerlo.</dd>
        </div>
      </dl>
      <p class="privacy-warning">
        Esta información describe el funcionamiento previsto de la web. Si se incorporan analítica, cuentas, servidores, formularios o servicios externos, esta política deberá revisarse antes de activar esas funciones.
      </p>
    `,
  },
  terms: {
    eyebrow: "TÉRMINOS DE USO",
    title: "Condiciones de uso de ToolHub",
    html: `
      <p>
        Al utilizar ToolHub aceptas usar sus herramientas de forma lícita, responsable y únicamente sobre archivos o información que tengas derecho a utilizar.
      </p>
      <dl class="privacy-details">
        <div>
          <dt>Uso permitido</dt>
          <dd>Las herramientas se ofrecen para tareas técnicas, educativas y de uso personal. No deben emplearse para acceder, modificar, vigilar o tratar información ajena sin autorización.</dd>
        </div>
        <div>
          <dt>Archivos de terceros</dt>
          <dd>El usuario es responsable de disponer de los permisos necesarios cuando un archivo contenga datos personales, material confidencial o contenido protegido de terceros.</dd>
        </div>
        <div>
          <dt>Uso prohibido</dt>
          <dd>No está permitido utilizar la web con fines ilícitos, abusivos, fraudulentos, de espionaje, vigilancia no autorizada o vulneración de derechos de terceros.</dd>
        </div>
        <div>
          <dt>Resultados</dt>
          <dd>Antes de sustituir o eliminar un archivo original, el usuario debe comprobar el resultado generado por la herramienta y conservar copias de seguridad cuando sea necesario.</dd>
        </div>
        <div>
          <dt>Propiedad</dt>
          <dd>ToolHub y su estructura pertenecen a 匚尺丨丂, salvo los nombres, marcas, bibliotecas o contenidos de terceros que conserven sus respectivos derechos.</dd>
        </div>
        <div>
          <dt>Cambios</dt>
          <dd>Las funciones y estas condiciones pueden actualizarse cuando cambie el funcionamiento de la web o sea necesario adaptar su información legal.</dd>
        </div>
      </dl>
      <p class="privacy-warning">
        El usuario debe revisar especialmente los archivos sensibles antes de procesarlos y evitar utilizar información que no sea necesaria para la tarea concreta.
      </p>
    `,
  },
};

function openInfoModal(type) {
  const content = infoModalContent[type];
  if (!content) return;

  infoModalEyebrow.textContent = content.eyebrow;
  infoModalTitle.textContent = content.title;
  infoModalBody.innerHTML = content.html;
  infoModalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  infoModalClose.focus();
}

function closeInfoModal() {
  infoModalBackdrop.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-info-modal]").forEach((button) => {
  button.addEventListener("click", () => openInfoModal(button.dataset.infoModal));
});

infoModalClose.addEventListener("click", closeInfoModal);
infoModalOk.addEventListener("click", closeInfoModal);

infoModalBackdrop.addEventListener("click", (event) => {
  if (event.target === infoModalBackdrop) closeInfoModal();
});

document.querySelectorAll(".tool-link").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.pdfTool === "true" && !privacyAccepted) {
      lockPageForPrivacy();
      return;
    }

    openModal(button.dataset.tool, "HERRAMIENTA");
  });
});

document.querySelectorAll(".guide-link").forEach((button) => {
  button.addEventListener("click", () => {
    openModal(button.dataset.guide, "GUÍA");
  });
});

modalClose.addEventListener("click", closeModal);
modalOk.addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (event) => {
  // El aviso inicial obligatorio no se cierra con Escape mientras esté pendiente.
  if (event.key !== "Escape" || !privacyAccepted) return;

  if (!infoModalBackdrop.hidden) {
    closeInfoModal();
    return;
  }

  if (!modalBackdrop.hidden) {
    closeModal();
  }
});

const observedSections = [
  document.getElementById("inicio"),
  document.getElementById("herramientas"),
  document.getElementById("guias"),
];

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${visible.target.id}`
      );
    });
  },
  {
    threshold: [0.25, 0.5, 0.75],
    rootMargin: "-15% 0px -55% 0px",
  }
);

observedSections.forEach((section) => {
  if (section) sectionObserver.observe(section);
});

/* =========================================================
   ToolHub v23.1 · Me gusta de la página
   - Se coloca justo a la izquierda del buscador.
   - No usa un contador falso: solo expresa la preferencia del visitante.
   - La elección se recuerda únicamente en este navegador.
   ========================================================= */
(() => {
  const headerActions = document.querySelector(".header-actions");
  const searchBox = document.querySelector(".search-box");
  if (!headerActions || !searchBox) return;

  const LIKE_STORAGE_KEY = "toolhub_site_like_v1";

  const style = document.createElement("style");
  style.textContent = `
    .site-like-button {
      position: relative;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex: 0 0 auto;
      padding: 0 13px;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--panel);
      color: var(--muted);
      cursor: pointer;
      font-weight: 750;
      line-height: 1;
      overflow: hidden;
      transition:
        transform .18s cubic-bezier(.16,1,.3,1),
        color .18s ease,
        border-color .18s ease,
        background .18s ease,
        box-shadow .18s ease;
    }

    .site-like-button:hover {
      transform: translateY(-1px);
      color: var(--text);
      border-color: rgba(255, 103, 139, .38);
    }

    .site-like-heart {
      display: inline-grid;
      place-items: center;
      width: 19px;
      color: #a8b5c8;
      font-size: 1.18rem;
      line-height: 1;
      transform-origin: center;
      transition: color .18s ease, transform .22s cubic-bezier(.16,1,.3,1), filter .18s ease;
    }

    .site-like-button.is-liked {
      color: #ffdce5;
      border-color: rgba(255, 89, 129, .42);
      background: linear-gradient(135deg, rgba(255, 75, 120, .10), rgba(155, 104, 255, .065)), var(--panel);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.025), 0 0 22px rgba(255, 71, 118, .06);
    }

    .site-like-button.is-liked .site-like-heart {
      color: #ff5f86;
      filter: drop-shadow(0 0 7px rgba(255, 76, 122, .38));
    }

    .site-like-button.like-pop .site-like-heart {
      animation: toolhub-like-pop .42s cubic-bezier(.2,1.65,.35,1);
    }

    .site-like-button:focus-visible {
      outline: 2px solid rgba(255, 103, 139, .65);
      outline-offset: 3px;
    }

    @keyframes toolhub-like-pop {
      0% { transform: scale(1); }
      42% { transform: scale(1.48) rotate(-9deg); }
      72% { transform: scale(.9) rotate(4deg); }
      100% { transform: scale(1); }
    }

    @media (max-width: 680px) {
      .site-like-button {
        width: 44px;
        padding: 0;
      }
      .site-like-label {
        display: none;
      }
    }

    /* La versión visible del sitio se mantiene aquí para no depender de cachés de otros CSS. */
    .footer .copyright::after {
      content: "Versión 23.1" !important;
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "siteLikeButton";
  button.className = "site-like-button";
  button.type = "button";
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <span class="site-like-heart" aria-hidden="true">♡</span>
    <span class="site-like-label">Me gusta</span>
  `;
  headerActions.insertBefore(button, searchBox);

  const heart = button.querySelector(".site-like-heart");
  const label = button.querySelector(".site-like-label");

  function readLiked() {
    try {
      return localStorage.getItem(LIKE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function storeLiked(liked) {
    try {
      if (liked) localStorage.setItem(LIKE_STORAGE_KEY, "1");
      else localStorage.removeItem(LIKE_STORAGE_KEY);
    } catch {
      // La interacción sigue funcionando durante la visita aunque el navegador bloquee localStorage.
    }
  }

  function renderLiked(liked, animate = false) {
    button.classList.toggle("is-liked", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.setAttribute("aria-label", liked ? "Quitar Me gusta de ToolHub" : "Marcar ToolHub como Me gusta");
    button.title = liked ? "Te gusta ToolHub · pulsa para quitarlo" : "¿Te gusta ToolHub?";
    heart.textContent = liked ? "♥" : "♡";
    label.textContent = liked ? "Te gusta" : "Me gusta";

    if (animate) {
      button.classList.remove("like-pop");
      void button.offsetWidth;
      button.classList.add("like-pop");
      setTimeout(() => button.classList.remove("like-pop"), 460);
    }
  }

  let liked = readLiked();
  renderLiked(liked);

  button.addEventListener("click", () => {
    liked = !liked;
    storeLiked(liked);
    renderLiked(liked, true);
  });

  // Mantiene la información de privacidad coherente con esta preferencia local.
  infoModalContent.about.html = infoModalContent.about.html.replace(
    "Se usa almacenamiento local para recordar la aceptación del aviso inicial y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap.",
    "Se usa almacenamiento local para recordar la aceptación del aviso inicial, la preferencia del botón Me gusta y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap."
  );

  infoModalContent.privacy.html = infoModalContent.privacy.html.replace(
    "Se guarda una marca en localStorage para recordar la aceptación del aviso inicial. Si el usuario activa la memoria de MatCap, también se guarda localmente un breve resumen de sus preferencias. No se almacenan imágenes ni archivos en esa memoria.",
    "Se guardan en localStorage la aceptación del aviso inicial y, si el visitante pulsa Me gusta, esa preferencia local. Si activa la memoria de MatCap, también se guarda localmente un breve resumen de sus preferencias. No se almacenan imágenes ni archivos mediante estas preferencias."
  );
})();