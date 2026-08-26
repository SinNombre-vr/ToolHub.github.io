
(() => {
  "use strict";

  const infoBackdrop = document.getElementById("vrchatInfoBackdrop");
  const infoOpen = document.getElementById("openVrchatInfo");
  const infoClose = document.getElementById("vrchatInfoClose");
  const infoOk = document.getElementById("vrchatInfoOk");

  const guides = {
    ovr: document.getElementById("ovrGuideBackdrop"),
    "virtual-desktop": document.getElementById("virtualDesktopGuideBackdrop"),
  };

  let previousFocus = null;

  function openBackdrop(backdrop) {
    if (!backdrop) return;
    previousFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => backdrop.querySelector(".modal-close")?.focus());
  }

  function closeBackdrop(backdrop) {
    if (!backdrop) return;
    backdrop.hidden = true;
    document.body.style.overflow = "";
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  infoOpen?.addEventListener("click", () => openBackdrop(infoBackdrop));
  infoClose?.addEventListener("click", () => closeBackdrop(infoBackdrop));
  infoOk?.addEventListener("click", () => closeBackdrop(infoBackdrop));

  infoBackdrop?.addEventListener("click", (event) => {
    if (event.target === infoBackdrop) closeBackdrop(infoBackdrop);
  });

  document.querySelectorAll("[data-vrchat-guide]").forEach((button) => {
    button.addEventListener("click", () => openBackdrop(guides[button.dataset.vrchatGuide]));
  });

  document.querySelectorAll("[data-vrchat-close-guide]").forEach((button) => {
    button.addEventListener("click", () => closeBackdrop(guides[button.dataset.vrchatCloseGuide]));
  });

  Object.values(guides).forEach((backdrop) => {
    backdrop?.addEventListener("click", (event) => {
      if (event.target === backdrop) closeBackdrop(backdrop);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (infoBackdrop && !infoBackdrop.hidden) {
      event.preventDefault();
      closeBackdrop(infoBackdrop);
      return;
    }

    const openGuide = Object.values(guides).find((backdrop) => backdrop && !backdrop.hidden);
    if (openGuide) {
      event.preventDefault();
      closeBackdrop(openGuide);
    }
  });
})();

/* ==========================================================
   ToolHub v23.2 · Me gusta global
   - El contador se guarda en Supabase y lo ve todo el mundo.
   - Un navegador/perfil usa un UUID aleatorio persistente para evitar votos duplicados
     desde ese mismo perfil.
   - La tabla de votos no se expone directamente; se usa mediante RPC.
   ========================================================== */
(() => {
  "use strict";

  const originalButton = document.getElementById("siteLikeButton");
  if (!originalButton) return;

  // Elimina el listener local antiguo conservando el diseño visual ya creado por script.js.
  const button = originalButton.cloneNode(true);
  originalButton.replaceWith(button);

  button.innerHTML = `
    <span class="site-like-heart" aria-hidden="true">♡</span>
    <span class="site-like-label">Me gusta</span>
    <span class="site-like-count" aria-live="polite">…</span>
  `;

  const heart = button.querySelector(".site-like-heart");
  const label = button.querySelector(".site-like-label");
  const count = button.querySelector(".site-like-count");

  const SUPABASE_URL = "https://ntbylihedfkpebhgmfpt.supabase.co";
  const SUPABASE_KEY = "sb_publishable_GxIk_gqhh4SIxLmd7igoVA_v1wPRgsz";
  const VISITOR_KEY = "toolhub_site_like_visitor_v2";
  const LEGACY_LIKE_KEY = "toolhub_site_like_v1";

  let client = null;
  let liked = false;
  let total = 0;
  let busy = false;

  const style = document.createElement("style");
  style.id = "toolhub-global-like-style";
  style.textContent = `
    .site-like-count {
      min-width: 1.6ch;
      padding-left: 7px;
      margin-left: 1px;
      border-left: 1px solid rgba(143, 160, 184, .20);
      color: var(--text);
      font-variant-numeric: tabular-nums;
      font-size: .82rem;
      font-weight: 850;
    }

    .site-like-button.is-liked .site-like-count {
      color: #ffdce5;
      border-left-color: rgba(255, 95, 134, .24);
    }

    .site-like-button.is-syncing {
      cursor: wait;
      opacity: .82;
    }

    @media (max-width: 680px) {
      .site-like-button {
        width: auto !important;
        min-width: 58px;
        padding: 0 10px !important;
      }

      .site-like-count {
        padding-left: 6px;
      }
    }

    .footer .copyright::after {
      content: "Versión 23.2" !important;
    }
  `;
  document.head.appendChild(style);

  function randomUuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getVisitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "")) {
        id = randomUuid();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch {
      return randomUuid();
    }
  }

  function legacyLiked() {
    try {
      return localStorage.getItem(LEGACY_LIKE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function clearLegacyLike() {
    try {
      localStorage.removeItem(LEGACY_LIKE_KEY);
    } catch {
      // Sin impacto funcional.
    }
  }

  function render(animate = false) {
    button.classList.toggle("is-liked", liked);
    button.setAttribute("aria-pressed", String(liked));
    button.setAttribute("aria-label", liked ? `Quitar Me gusta de ToolHub. ${total} Me gusta` : `Dar Me gusta a ToolHub. ${total} Me gusta`);
    button.title = liked ? `Te gusta ToolHub · ${total} Me gusta` : `${total} Me gusta · ¿Te gusta ToolHub?`;
    heart.textContent = liked ? "♥" : "♡";
    label.textContent = liked ? "Te gusta" : "Me gusta";
    count.textContent = String(total);

    if (animate) {
      button.classList.remove("like-pop");
      void button.offsetWidth;
      button.classList.add("like-pop");
      setTimeout(() => button.classList.remove("like-pop"), 460);
    }
  }

  function setBusy(value) {
    busy = value;
    button.disabled = value;
    button.classList.toggle("is-syncing", value);
  }

  function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-toolhub-supabase="1"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.dataset.toolhubSupabase = "1";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (client) return client;
    await loadSupabaseLibrary();
    if (!window.supabase?.createClient) throw new Error("Supabase no disponible");
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  async function readStatus(visitorId) {
    const db = await getClient();
    const { data, error } = await db.rpc("toolhub_home_like_status", { p_visitor: visitorId });
    if (error) throw error;
    return data || { liked: false, count: 0 };
  }

  async function writeStatus(visitorId, nextLiked) {
    const db = await getClient();
    const { data, error } = await db.rpc("toolhub_home_set_like", {
      p_visitor: visitorId,
      p_liked: nextLiked
    });
    if (error) throw error;
    return data || { liked: nextLiked, count: total };
  }

  const visitorId = getVisitorId();

  async function sync({ migrateLegacy = false } = {}) {
    if (busy) return;
    setBusy(true);

    try {
      let state = await readStatus(visitorId);

      // Conserva el Me gusta que alguien hubiera dado con la versión 23.1 local.
      if (migrateLegacy && legacyLiked() && !state.liked) {
        state = await writeStatus(visitorId, true);
        clearLegacyLike();
      }

      liked = Boolean(state.liked);
      total = Number(state.count) || 0;
      render(false);
      button.dataset.globalLikes = "ready";
    } catch (error) {
      console.warn("ToolHub global likes:", error);
      count.textContent = "?";
      button.title = "El contador global de Me gusta aún no está disponible.";
      button.dataset.globalLikes = "error";
    } finally {
      setBusy(false);
    }
  }

  button.addEventListener("click", async () => {
    if (busy) return;
    const previousLiked = liked;
    const previousTotal = total;
    const nextLiked = !liked;

    // Respuesta visual inmediata; Supabase confirma el valor real después.
    liked = nextLiked;
    total = Math.max(0, total + (nextLiked ? 1 : -1));
    render(true);
    setBusy(true);

    try {
      const state = await writeStatus(visitorId, nextLiked);
      liked = Boolean(state.liked);
      total = Number(state.count) || 0;
      render(false);
    } catch (error) {
      liked = previousLiked;
      total = previousTotal;
      render(false);
      console.warn("No se pudo registrar el Me gusta:", error);
      button.title = "No se pudo registrar el Me gusta. Inténtalo de nuevo.";
    } finally {
      setBusy(false);
    }
  });

  // Actualiza el contador de forma periódica para reflejar votos de otros visitantes.
  const refreshTimer = setInterval(() => {
    if (!document.hidden) sync();
  }, 30000);

  window.addEventListener("pagehide", () => clearInterval(refreshTimer), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });

  // Actualiza la información de privacidad: el voto ya no es únicamente local.
  try {
    if (typeof infoModalContent !== "undefined") {
      infoModalContent.about.html = infoModalContent.about.html
        .replace(
          "Se usa almacenamiento local para recordar la aceptación del aviso inicial, la preferencia del botón Me gusta y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap.",
          "Se usa almacenamiento local para recordar la aceptación del aviso inicial, un identificador aleatorio del navegador para evitar Me gusta duplicados desde ese perfil y, si el usuario lo activa, para conservar una memoria de preferencias del Generador de MatCap. El voto y el contador global de Me gusta se registran en Supabase."
        );

      infoModalContent.privacy.html = infoModalContent.privacy.html
        .replace(
          "Se guardan en localStorage la aceptación del aviso inicial y, si el visitante pulsa Me gusta, esa preferencia local. Si activa la memoria de MatCap, también se guarda localmente un breve resumen de sus preferencias. No se almacenan imágenes ni archivos mediante estas preferencias.",
          "Se guardan en localStorage la aceptación del aviso inicial y un identificador aleatorio del navegador usado para evitar votos duplicados desde ese perfil. Cuando el visitante pulsa Me gusta, el voto se registra en Supabase para formar un contador global visible para todos. No se guarda nombre, correo ni contenido de archivos en ese registro."
        );
    }
  } catch {
    // La función de Me gusta no depende del modal legal.
  }

  sync({ migrateLegacy: true });
})();
