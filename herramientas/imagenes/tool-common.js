
(() => {
  "use strict";

  const commonScriptUrl = document.currentScript?.src || location.href;

  function loadToolHubAddon(relativePath, marker) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement("script");
    script.src = new URL(relativePath, commonScriptUrl).href;
    script.defer = true;
    script.setAttribute(marker, "1");
    document.head.appendChild(script);
  }

  loadToolHubAddon("../../toolhub-user.js?v=1", "data-toolhub-user");
  loadToolHubAddon("../../toolhub-creator-enhancements.js?v=1", "data-toolhub-creator-enhancements");
})();

(() => {
  const PRIVACY_STORAGE_KEY = "toolhub_privacy_notice_v1";

  const privacyBackdrop = document.getElementById("pdfPrivacyBackdrop");
  const privacyCheck = document.getElementById("pdfPrivacyCheck");
  const privacyContinue = document.getElementById("pdfPrivacyContinue");
  const pageRegions = [
    document.querySelector(".topbar"),
    document.querySelector("main"),
    document.querySelector(".footer"),
  ].filter(Boolean);

  function hasPrivacyAcceptance() {
    try {
      return localStorage.getItem(PRIVACY_STORAGE_KEY) === "accepted";
    } catch {
      return false;
    }
  }

  function storePrivacyAcceptance() {
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, "accepted");
    } catch {
      // Si el navegador impide el almacenamiento, el aviso puede reaparecer.
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

  function showPrivacyGate() {
    if (!privacyBackdrop || !privacyCheck || !privacyContinue) return;
    privacyBackdrop.hidden = false;
    privacyCheck.checked = false;
    privacyContinue.disabled = true;
    document.documentElement.classList.add("privacy-pending");
    setPageLocked(true);
    requestAnimationFrame(() => privacyCheck.focus());
  }

  function hidePrivacyGate() {
    if (!privacyBackdrop) return;
    privacyBackdrop.hidden = true;
    document.documentElement.classList.remove("privacy-pending");
    setPageLocked(false);
  }

  if (hasPrivacyAcceptance()) {
    hidePrivacyGate();
  } else {
    showPrivacyGate();
  }

  privacyCheck?.addEventListener("change", () => {
    privacyContinue.disabled = !privacyCheck.checked;
  });

  privacyContinue?.addEventListener("click", () => {
    if (!privacyCheck.checked) return;
    storePrivacyAcceptance();
    hidePrivacyGate();
    document.querySelector(".brand")?.focus();
  });

  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    themeToggle.textContent = isLight ? "☀" : "☾";
    themeToggle.setAttribute(
      "aria-label",
      isLight ? "Activar tema oscuro" : "Activar tema claro"
    );
  });

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  menuToggle?.addEventListener("click", () => {
    const open = mainNav?.classList.toggle("open") ?? false;
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  mainNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  const currentYear = document.getElementById("currentYear");
  if (currentYear) currentYear.textContent = new Date().getFullYear();

  const infoModalBackdrop = document.getElementById("infoModalBackdrop");
  const infoModalClose = document.getElementById("infoModalClose");
  const infoModalOk = document.getElementById("infoModalOk");
  const infoModalEyebrow = document.getElementById("infoModalEyebrow");
  const infoModalTitle = document.getElementById("infoModalTitle");
  const infoModalBody = document.getElementById("infoModalBody");

  const infoModalContent = {
    about: {
      eyebrow: "SOBRE LA WEB",
      title: "Finalidad de ToolHub",
      html: `
        <p>
          ToolHub es un proyecto orientado a reunir herramientas,
          guías y utilidades técnicas en un único sitio.
        </p>
        <dl class="privacy-details">
          <div>
            <dt>Finalidad</dt>
            <dd>Facilitar tareas concretas relacionadas con imágenes, PDF, PC, VR, Unity, VRChat y Discord.</dd>
          </div>
          <div>
            <dt>Privacidad por diseño</dt>
            <dd>La web no está destinada al espionaje, vigilancia, seguimiento oculto ni recopilación encubierta de información.</dd>
          </div>
          <div>
            <dt>Archivos</dt>
            <dd>Las herramientas de imágenes procesan los archivos directamente en el navegador y no los envían a servidores de ToolHub salvo que una función indique expresamente lo contrario.</dd>
          </div>
          <div>
            <dt>Perfiles</dt>
            <dd>Las cuentas usan Supabase Auth. El perfil permite guardar favoritos, colecciones, contribuciones, reputación y configuraciones de los estudios de ToolHub.</dd>
          </div>
          <div>
            <dt>Asistente de MatCap</dt>
            <dd>El modo local gratuito funciona íntegramente en el navegador. Si eliges Ollama, el texto se procesa con un modelo instalado en tu propio PC. Solo si eliges OpenAI se envían a esa API el texto, parámetros y memoria seleccionada. No se envían imágenes ni archivos desde esta función.</dd>
          </div>
        </dl>
      `,
    },
    privacy: {
      eyebrow: "POLÍTICA DE PRIVACIDAD",
      title: "Privacidad y protección de datos",
      html: `
        <p>
          ToolHub está diseñada para reducir al mínimo el tratamiento de información
          y mantener localmente los archivos siempre que sea técnicamente posible.
        </p>
        <dl class="privacy-details">
          <div>
            <dt>Responsable</dt>
            <dd>匚尺丨丂.</dd>
          </div>
          <div>
            <dt>Herramientas de imagen</dt>
            <dd>La conversión, redimensionado, compresión, generación de gradientes, MatCaps y Normal Maps se ejecutan en el navegador del usuario.</dd>
          </div>
          <div>
            <dt>Cuenta y autenticación</dt>
            <dd>Si creas una cuenta, Supabase Auth gestiona el correo y la autenticación. ToolHub mantiene un perfil asociado a ese identificador de usuario.</dd>
          </div>
          <div>
            <dt>Perfil público</dt>
            <dd>Nombre de usuario, nombre visible, avatar, bio y reputación pueden mostrarse públicamente. Los favoritos y las colecciones privadas se protegen mediante políticas de acceso de la base de datos.</dd>
          </div>
          <div>
            <dt>Creaciones guardadas</dt>
            <dd>Al elegir “Guardar en perfil” se almacena la configuración de parámetros del MatCap o Shader. Las texturas locales y archivos de trabajo no se suben por esa acción.</dd>
          </div>
          <div>
            <dt>Avatares</dt>
            <dd>El avatar elegido para el perfil se almacena en Supabase Storage. No es necesario subir un avatar para utilizar la cuenta.</dd>
          </div>
          <div>
            <dt>Asistente e IA opcional</dt>
            <dd>El asistente local no necesita un servicio externo. Ollama puede ejecutar un modelo en el propio PC. OpenAI sigue disponible como opción externa y, si se selecciona, recibe únicamente el texto, parámetros numéricos/colores y la memoria elegida; no recibe imágenes o archivos desde esta función.</dd>
          </div>
          <div>
            <dt>Normativa de referencia</dt>
            <dd>Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD), junto con la normativa aplicable.</dd>
          </div>
        </dl>
      `,
    },
    terms: {
      eyebrow: "TÉRMINOS DE USO",
      title: "Condiciones de uso de ToolHub",
      html: `
        <p>
          Al utilizar ToolHub aceptas emplear sus herramientas de forma lícita,
          responsable y únicamente sobre archivos o información que tengas derecho a utilizar.
        </p>
        <dl class="privacy-details">
          <div>
            <dt>Uso permitido</dt>
            <dd>Las herramientas se ofrecen para tareas técnicas, educativas y de uso personal.</dd>
          </div>
          <div>
            <dt>Archivos de terceros</dt>
            <dd>El usuario es responsable de disponer de los permisos necesarios cuando procese información o contenido de terceros.</dd>
          </div>
          <div>
            <dt>Cuenta</dt>
            <dd>El usuario es responsable de mantener seguras sus credenciales y de no usar perfiles, contribuciones o colecciones para suplantar a terceros o publicar contenido ilícito.</dd>
          </div>
          <div>
            <dt>Uso prohibido</dt>
            <dd>No está permitido utilizar la web con fines ilícitos, abusivos, fraudulentos, de espionaje o vigilancia no autorizada.</dd>
          </div>
          <div>
            <dt>Funciones de IA</dt>
            <dd>No introduzcas datos personales, confidenciales o de terceros que no sean necesarios para describir el resultado técnico que deseas.</dd>
          </div>
          <div>
            <dt>Resultados</dt>
            <dd>Comprueba siempre los archivos resultantes antes de sustituir los originales y conserva copias de seguridad cuando sea necesario.</dd>
          </div>
          <div>
            <dt>Propiedad</dt>
            <dd>ToolHub y su estructura pertenecen a 匚尺丨丂, salvo los derechos que correspondan a terceros.</dd>
          </div>
        </dl>
      `,
    },
  };

  function openInfoModal(type) {
    const content = infoModalContent[type];
    if (!content || !infoModalBackdrop) return;

    infoModalEyebrow.textContent = content.eyebrow;
    infoModalTitle.textContent = content.title;
    infoModalBody.innerHTML = content.html;
    infoModalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    infoModalClose?.focus();
  }

  function closeInfoModal() {
    if (!infoModalBackdrop) return;
    infoModalBackdrop.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-info-modal]").forEach((button) => {
    button.addEventListener("click", () => openInfoModal(button.dataset.infoModal));
  });

  infoModalClose?.addEventListener("click", closeInfoModal);
  infoModalOk?.addEventListener("click", closeInfoModal);
  infoModalBackdrop?.addEventListener("click", (event) => {
    if (event.target === infoModalBackdrop) closeInfoModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !privacyBackdrop?.hidden) return;
    if (infoModalBackdrop && !infoModalBackdrop.hidden) closeInfoModal();
  });
})();
