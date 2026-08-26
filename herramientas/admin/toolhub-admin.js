(() => {
  "use strict";

  if (window.__TOOLHUB_GLOBAL_ADMIN__) return;
  window.__TOOLHUB_GLOBAL_ADMIN__ = true;

  const ADMIN_ROLES = new Set(["owner", "admin", "moderator"]);
  const PRIVATE_ROLES = new Set(["owner", "admin"]);

  const state = {
    client: null,
    user: null,
    role: null,
    ready: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      if (marker && document.querySelector(marker)) {
        const existing = document.querySelector(marker);
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      if (marker === 'script[data-toolhub-supabase-cdn]') script.dataset.toolhubSupabaseCdn = "1";
      if (marker === 'script[data-toolhub-supabase-config]') script.dataset.toolhubSupabaseConfig = "1";
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase() {
    if (!window.supabase?.createClient) {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
        'script[data-toolhub-supabase-cdn]'
      );
    }

    if (!window.TOOLHUB_SUPABASE) {
      await loadScript(
        "herramientas/assets-library/supabase-config.js?v=2",
        'script[data-toolhub-supabase-config]'
      );
    }

    const config = window.TOOLHUB_SUPABASE;
    if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
      throw new Error("Supabase no está configurado.");
    }

    if (!state.client) {
      state.client = window.supabase.createClient(config.url, config.publishableKey);
    }
    return state.client;
  }

  const style = document.createElement("style");
  style.id = "toolhubGlobalAdminStyles";
  style.textContent = `
    .toolhub-admin-lock {
      width:44px;height:44px;display:grid;place-items:center;flex:0 0 44px;
      padding:0;border:1px solid var(--border);border-radius:11px;background:var(--panel);
      color:var(--muted);cursor:pointer;transition:transform .18s ease,color .18s ease,
      border-color .18s ease,background .18s ease,box-shadow .18s ease;
    }
    .toolhub-admin-lock:hover { transform:translateY(-1px);color:var(--text);border-color:rgba(255,86,98,.38); }
    .toolhub-admin-lock svg { width:19px;height:19px;display:block; }
    .toolhub-admin-lock.is-active {
      color:#ff6470;border-color:rgba(255,76,90,.5);
      background:linear-gradient(145deg,rgba(255,45,61,.10),rgba(105,13,24,.07)),var(--panel);
      box-shadow:0 0 22px rgba(255,42,61,.08),inset 0 1px 0 rgba(255,255,255,.035);
    }
    .toolhub-admin-lock:focus-visible { outline:2px solid rgba(255,91,103,.7);outline-offset:3px; }

    .toolhub-admin-overlay {
      position:fixed;inset:0;z-index:13000;display:grid;place-items:center;padding:20px;
      background:rgba(2,4,9,.7);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
    }
    .toolhub-admin-overlay[hidden] { display:none; }
    .toolhub-admin-card {
      position:relative;width:min(440px,100%);padding:28px;border-radius:19px;
      border:1px solid rgba(255,79,92,.22);background:var(--panel-strong);
      box-shadow:0 28px 90px rgba(0,0,0,.42);
    }
    .toolhub-admin-close {
      position:absolute;right:11px;top:11px;width:38px;height:38px;border:0;border-radius:10px;
      background:transparent;color:var(--muted);font-size:1.55rem;cursor:pointer;
    }
    .toolhub-admin-kicker { color:#ff5b68;font-size:.72rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase; }
    .toolhub-admin-card h2 { margin:9px 44px 8px 0;font-size:1.8rem;letter-spacing:-.035em; }
    .toolhub-admin-card p { color:var(--muted);line-height:1.6;margin:0 0 18px; }
    .toolhub-admin-fields { display:grid;gap:12px; }
    .toolhub-admin-fields label { display:grid;gap:7px;color:var(--muted);font-size:.82rem;font-weight:750; }
    .toolhub-admin-fields input {
      width:100%;height:45px;padding:0 12px;border:1px solid var(--border);border-radius:11px;
      background:var(--bg-soft);color:var(--text);outline:none;
    }
    .toolhub-admin-fields input:focus { border-color:rgba(255,85,99,.55);box-shadow:0 0 0 3px rgba(255,85,99,.08); }
    .toolhub-admin-actions { display:flex;gap:10px;flex-wrap:wrap;margin-top:16px; }
    .toolhub-admin-primary,.toolhub-admin-secondary {
      min-height:43px;padding:0 15px;border-radius:10px;cursor:pointer;font-weight:800;
    }
    .toolhub-admin-primary { border:1px solid rgba(255,91,104,.45);background:#e84150;color:white; }
    .toolhub-admin-secondary { border:1px solid var(--border);background:var(--panel);color:var(--text); }
    .toolhub-admin-message { min-height:20px;margin-top:12px;color:var(--muted);font-size:.82rem;line-height:1.45; }
    .toolhub-admin-message.error { color:#ff7a84; }
    .toolhub-admin-message.ok { color:#72e2b6; }
    .toolhub-admin-session { margin:14px 0 0;padding:13px;border-radius:11px;border:1px solid rgba(255,90,103,.18);background:rgba(255,55,69,.05); }
    .toolhub-admin-session strong { display:block;color:#ff6b77;margin-bottom:4px; }
    .toolhub-admin-session span { color:var(--muted);font-size:.82rem; }

    .asset-library-private-card {
      margin-top:14px!important;border-color:rgba(255,66,78,.28)!important;
      background:
        radial-gradient(circle at 12% 12%,rgba(255,40,55,.11),transparent 34%),
        linear-gradient(145deg,rgba(65,12,19,.34),rgba(15,16,25,.72)),var(--panel)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
    }
    .asset-library-private-card:hover {
      border-color:rgba(255,77,91,.62)!important;
      box-shadow:0 18px 54px rgba(50,0,7,.22),inset 0 1px 0 rgba(255,255,255,.035)!important;
    }
    .asset-library-private-card .asset-library-home-icon {
      border-color:rgba(255,83,95,.24)!important;background:rgba(255,48,63,.09)!important;
    }
    .asset-library-private-card .asset-library-home-kicker,
    .asset-library-private-card .asset-library-home-arrow { color:#ff5c69!important; }
    .asset-library-private-card .asset-library-home-tags span {
      border-color:rgba(255,86,98,.16)!important;background:rgba(255,64,78,.055)!important;
    }
    .asset-library-private-card.is-entering { animation:toolhub-private-enter .34s cubic-bezier(.2,.78,.2,1); }
    @keyframes toolhub-private-enter { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
  `;
  document.head.appendChild(style);

  const headerActions = $(".header-actions");
  const themeToggle = $("#themeToggle");
  if (!headerActions || !themeToggle) return;

  const lock = document.createElement("button");
  lock.id = "toolhubAdminLock";
  lock.className = "toolhub-admin-lock";
  lock.type = "button";
  lock.setAttribute("aria-label", "Abrir acceso privado");
  lock.title = "Acceso privado";
  lock.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" stroke="currentColor" stroke-width="1.8"/>
      <path class="toolhub-admin-lock-shackle" d="M8 10V7.6A4 4 0 0 1 12 3.6a4 4 0 0 1 4 4V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="15" r="1.15" fill="currentColor"/>
    </svg>`;
  themeToggle.insertAdjacentElement("afterend", lock);

  const overlay = document.createElement("div");
  overlay.className = "toolhub-admin-overlay";
  overlay.id = "toolhubAdminOverlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="toolhub-admin-card" role="dialog" aria-modal="true" aria-labelledby="toolhubAdminTitle">
      <button class="toolhub-admin-close" type="button" aria-label="Cerrar">×</button>
      <span class="toolhub-admin-kicker">ACCESO PRIVADO</span>
      <h2 id="toolhubAdminTitle">Zona protegida</h2>
      <p class="toolhub-admin-copy">Usa la misma cuenta autorizada de Supabase que emplea la administración de la biblioteca.</p>
      <div class="toolhub-admin-session" hidden>
        <strong>Acceso activo</strong>
        <span class="toolhub-admin-session-copy"></span>
      </div>
      <div class="toolhub-admin-fields">
        <label>Email<input id="toolhubAdminEmail" type="email" autocomplete="username" placeholder="tu@email.com"></label>
        <label>Contraseña<input id="toolhubAdminPassword" type="password" autocomplete="current-password" placeholder="Contraseña de Supabase"></label>
      </div>
      <div class="toolhub-admin-actions">
        <button class="toolhub-admin-primary" id="toolhubAdminLogin" type="button">Entrar</button>
        <button class="toolhub-admin-secondary" id="toolhubAdminLogout" type="button" hidden>Cerrar sesión</button>
      </div>
      <div class="toolhub-admin-message" id="toolhubAdminMessage" aria-live="polite"></div>
    </section>`;
  document.body.appendChild(overlay);

  const emailInput = $("#toolhubAdminEmail", overlay);
  const passwordInput = $("#toolhubAdminPassword", overlay);
  const loginButton = $("#toolhubAdminLogin", overlay);
  const logoutButton = $("#toolhubAdminLogout", overlay);
  const closeButton = $(".toolhub-admin-close", overlay);
  const message = $("#toolhubAdminMessage", overlay);
  const fields = $(".toolhub-admin-fields", overlay);
  const sessionBox = $(".toolhub-admin-session", overlay);
  const sessionCopy = $(".toolhub-admin-session-copy", overlay);
  const librarySection = $("#asset-library");

  function setMessage(text, mode = "") {
    message.textContent = text || "";
    message.className = "toolhub-admin-message" + (mode ? ` ${mode}` : "");
  }

  function roleLabel(role) {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    if (role === "moderator") return "Moderator";
    return "Sin rol";
  }

  function privateCard() {
    return $("#toolhubPrivateWarehouseCard");
  }

  function showPrivateCard(show) {
    const existing = privateCard();
    if (!show) {
      existing?.remove();
      return;
    }
    if (existing || !librarySection) return;

    const normal = $(".asset-library-home-card", librarySection);
    const card = document.createElement("a");
    card.id = "toolhubPrivateWarehouseCard";
    card.className = "asset-library-home-card asset-library-private-card is-entering";
    card.href = "biblioteca-assets-privada.html";
    card.innerHTML = `
      <div class="asset-library-home-icon">🔐</div>
      <div class="asset-library-home-copy">
        <span class="asset-library-home-kicker">ALMACÉN PRIVADO</span>
        <h3>Almacén privado de Assets</h3>
        <p>Catálogo separado del almacén público. Su contenido solo puede ser consultado por cuentas Owner o Admin autorizadas.</p>
        <div class="asset-library-home-tags" aria-label="Acceso privado">
          <span>Privado</span><span>Owner / Admin</span><span>Supabase RLS</span>
        </div>
      </div>
      <span class="asset-library-home-arrow" aria-hidden="true">→</span>`;

    if (normal?.parentNode === librarySection) normal.insertAdjacentElement("afterend", card);
    else librarySection.appendChild(card);
    setTimeout(() => card.classList.remove("is-entering"), 450);
  }

  function renderState() {
    const active = Boolean(state.user && ADMIN_ROLES.has(state.role));
    const privateAllowed = Boolean(state.user && PRIVATE_ROLES.has(state.role));
    lock.classList.toggle("is-active", active);
    lock.setAttribute("aria-label", active ? "Acceso privado activo" : "Abrir acceso privado");
    lock.title = active ? `Acceso activo · ${roleLabel(state.role)}` : "Acceso privado";

    const shackle = $(".toolhub-admin-lock-shackle", lock);
    if (shackle) {
      shackle.setAttribute("d", active
        ? "M9 10V7.7A4 4 0 0 1 16 5.1"
        : "M8 10V7.6A4 4 0 0 1 12 3.6a4 4 0 0 1 4 4V10");
    }

    fields.hidden = active;
    loginButton.hidden = active;
    logoutButton.hidden = !active;
    sessionBox.hidden = !active;
    if (active) {
      sessionCopy.textContent = `${roleLabel(state.role)}${state.user?.email ? ` · ${state.user.email}` : ""}`;
      setMessage(privateAllowed
        ? "El almacén privado está disponible en la sección de Assets."
        : "Esta cuenta puede moderar el catálogo público, pero no tiene acceso al almacén privado.",
        privateAllowed ? "ok" : "");
    } else {
      sessionCopy.textContent = "";
      if (state.ready) setMessage("");
    }
    showPrivateCard(privateAllowed);
  }

  async function checkRole(user) {
    if (!user) return null;
    const client = await ensureSupabase();
    const { data, error } = await client
      .from("toolhub_admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.role || null;
  }

  async function refreshSession() {
    try {
      const client = await ensureSupabase();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data.session?.user || null;
      let role = null;
      if (user) role = await checkRole(user);
      state.user = user && ADMIN_ROLES.has(role) ? user : null;
      state.role = ADMIN_ROLES.has(role) ? role : null;
      state.ready = true;
      renderState();
    } catch (error) {
      console.error("ToolHub admin:", error);
      state.ready = true;
      setMessage("No se pudo comprobar el acceso privado.", "error");
      renderState();
    }
  }

  function openOverlay() {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => (state.user ? logoutButton : emailInput).focus({ preventScroll: true }), 20);
  }

  function closeOverlay() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    lock.focus({ preventScroll: true });
  }

  lock.addEventListener("click", openOverlay);
  closeButton.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeOverlay();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeOverlay();
  });

  loginButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      setMessage("Introduce email y contraseña.", "error");
      return;
    }

    loginButton.disabled = true;
    setMessage("Comprobando acceso…");
    try {
      const client = await ensureSupabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error("No se pudo iniciar sesión.");

      const role = await checkRole(data.user);
      if (!ADMIN_ROLES.has(role)) {
        await client.auth.signOut();
        throw new Error("Esta cuenta no está autorizada para administrar ToolHub.");
      }

      state.user = data.user;
      state.role = role;
      state.ready = true;
      passwordInput.value = "";
      renderState();
    } catch (error) {
      state.user = null;
      state.role = null;
      setMessage(error?.message || "No se pudo iniciar sesión.", "error");
      renderState();
    } finally {
      loginButton.disabled = false;
    }
  });

  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loginButton.click();
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const client = await ensureSupabase();
      await client.auth.signOut();
      state.user = null;
      state.role = null;
      renderState();
      setMessage("Sesión cerrada.");
    } finally {
      logoutButton.disabled = false;
    }
  });

  refreshSession();
})();
