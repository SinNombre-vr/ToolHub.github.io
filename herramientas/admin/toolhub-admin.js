(() => {
  "use strict";

  if (window.__TOOLHUB_GLOBAL_ADMIN__) return;
  window.__TOOLHUB_GLOBAL_ADMIN__ = true;

  const ADMIN_ROLES = new Set(["owner", "admin"]);
  const $ = (selector, root = document) => root.querySelector(selector);

  const state = {
    user: null,
    role: null,
    ready: false,
  };

  function roleLabel(role) {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return "Usuario";
  }

  function profileUrl() {
    if (window.ToolHubAccount?.profileUrl) {
      const url = new URL(window.ToolHubAccount.profileUrl);
      url.searchParams.set("next", location.href);
      return url.href;
    }
    const url = new URL("profile.html", location.href);
    url.searchParams.set("next", location.href);
    return url.href;
  }

  const style = document.createElement("style");
  style.id = "toolhubGlobalAdminStyles";
  style.textContent = `
    .toolhub-admin-lock{width:44px;height:44px;display:grid;place-items:center;flex:0 0 44px;padding:0;border:1px solid var(--border);border-radius:11px;background:var(--panel);color:var(--muted);cursor:pointer;transition:.18s ease}
    .toolhub-admin-lock:hover{transform:translateY(-1px);color:var(--text);border-color:rgba(255,86,98,.38)}
    .toolhub-admin-lock svg{width:19px;height:19px;display:block}
    .toolhub-admin-lock.is-active{color:#ff6470;border-color:rgba(255,76,90,.5);background:linear-gradient(145deg,rgba(255,45,61,.10),rgba(105,13,24,.07)),var(--panel);box-shadow:0 0 22px rgba(255,42,61,.08),inset 0 1px 0 rgba(255,255,255,.035)}
    .toolhub-admin-lock:focus-visible{outline:2px solid rgba(255,91,103,.7);outline-offset:3px}
    .toolhub-admin-overlay{position:fixed;inset:0;z-index:13000;display:grid;place-items:center;padding:20px;background:rgba(2,4,9,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
    .toolhub-admin-overlay[hidden]{display:none}
    .toolhub-admin-card{position:relative;width:min(440px,100%);padding:28px;border-radius:19px;border:1px solid rgba(255,79,92,.22);background:var(--panel-strong);box-shadow:0 28px 90px rgba(0,0,0,.42)}
    .toolhub-admin-close{position:absolute;right:11px;top:11px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:var(--muted);font-size:1.55rem;cursor:pointer}
    .toolhub-admin-kicker{color:#ff5b68;font-size:.72rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
    .toolhub-admin-card h2{margin:9px 44px 8px 0;font-size:1.8rem;letter-spacing:-.035em}
    .toolhub-admin-card p{color:var(--muted);line-height:1.6;margin:0 0 18px}
    .toolhub-admin-session{margin:14px 0 0;padding:14px;border-radius:11px;border:1px solid rgba(255,90,103,.18);background:rgba(255,55,69,.05)}
    .toolhub-admin-session strong{display:block;color:#ff6b77;margin-bottom:5px}.toolhub-admin-session span{color:var(--muted);font-size:.84rem;line-height:1.5}
    .toolhub-admin-session.is-ok{border-color:rgba(63,218,154,.24);background:rgba(35,170,117,.06)}.toolhub-admin-session.is-ok strong{color:#72e2b6}
    .toolhub-admin-session.is-denied{border-color:rgba(255,184,70,.24);background:rgba(190,118,20,.06)}.toolhub-admin-session.is-denied strong{color:#ffc36b}
    .toolhub-admin-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.toolhub-admin-primary,.toolhub-admin-secondary{min-height:43px;padding:0 15px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;font-weight:800}
    .toolhub-admin-primary{border:1px solid rgba(255,91,104,.45);background:#e84150;color:white}.toolhub-admin-secondary{border:1px solid var(--border);background:var(--panel);color:var(--text)}
    .asset-library-private-card{margin-top:14px!important;border-color:rgba(255,66,78,.28)!important;background:radial-gradient(circle at 12% 12%,rgba(255,40,55,.11),transparent 34%),linear-gradient(145deg,rgba(65,12,19,.34),rgba(15,16,25,.72)),var(--panel)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
    .asset-library-private-card:hover{border-color:rgba(255,77,91,.62)!important;box-shadow:0 18px 54px rgba(50,0,7,.22),inset 0 1px 0 rgba(255,255,255,.035)!important}
    .asset-library-private-card .asset-library-home-icon{border-color:rgba(255,83,95,.24)!important;background:rgba(255,48,63,.09)!important}.asset-library-private-card .asset-library-home-kicker,.asset-library-private-card .asset-library-home-arrow{color:#ff5c69!important}.asset-library-private-card .asset-library-home-tags span{border-color:rgba(255,86,98,.16)!important;background:rgba(255,64,78,.055)!important}
    .asset-library-private-card.is-entering{animation:toolhub-private-enter .34s cubic-bezier(.2,.78,.2,1)}@keyframes toolhub-private-enter{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(style);

  const headerActions = $(".header-actions");
  const themeToggle = $("#themeToggle");
  if (!headerActions || !themeToggle) return;

  const lock = document.createElement("button");
  lock.id = "toolhubAdminLock";
  lock.className = "toolhub-admin-lock";
  lock.type = "button";
  lock.setAttribute("aria-label", "Comprobar acceso administrativo");
  lock.title = "Administración";
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
      <span class="toolhub-admin-kicker">ADMINISTRACIÓN</span>
      <h2 id="toolhubAdminTitle">Zona protegida</h2>
      <p>La administración usa tu sesión normal de ToolHub. Solo las cuentas con rol <strong>Owner</strong> o <strong>Admin</strong> reciben acceso.</p>
      <div class="toolhub-admin-session" id="toolhubAdminSession">
        <strong id="toolhubAdminSessionTitle">Comprobando cuenta…</strong>
        <span id="toolhubAdminSessionCopy">Espera un momento.</span>
      </div>
      <div class="toolhub-admin-actions" id="toolhubAdminActions"></div>
    </section>`;
  document.body.appendChild(overlay);

  const closeButton = $(".toolhub-admin-close", overlay);
  const sessionBox = $("#toolhubAdminSession", overlay);
  const sessionTitle = $("#toolhubAdminSessionTitle", overlay);
  const sessionCopy = $("#toolhubAdminSessionCopy", overlay);
  const actions = $("#toolhubAdminActions", overlay);
  const librarySection = $("#asset-library");

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
        <p>Catálogo reservado a cuentas Owner y Admin autorizadas.</p>
        <div class="asset-library-home-tags" aria-label="Acceso privado"><span>Privado</span><span>Owner / Admin</span><span>Supabase RLS</span></div>
      </div>
      <span class="asset-library-home-arrow" aria-hidden="true">→</span>`;
    if (normal?.parentNode === librarySection) normal.insertAdjacentElement("afterend", card);
    else librarySection.appendChild(card);
    setTimeout(() => card.classList.remove("is-entering"), 450);
  }

  function renderState() {
    const allowed = Boolean(state.user && ADMIN_ROLES.has(state.role));
    lock.classList.toggle("is-active", allowed);
    lock.title = allowed ? `Administración activa · ${roleLabel(state.role)}` : "Administración";
    lock.setAttribute("aria-label", allowed ? "Administración activa" : "Comprobar acceso administrativo");

    const shackle = $(".toolhub-admin-lock-shackle", lock);
    if (shackle) {
      shackle.setAttribute("d", allowed
        ? "M9 10V7.7A4 4 0 0 1 16 5.1"
        : "M8 10V7.6A4 4 0 0 1 12 3.6a4 4 0 0 1 4 4V10");
    }

    sessionBox.className = "toolhub-admin-session";
    actions.replaceChildren();

    if (!state.ready) {
      sessionTitle.textContent = "Comprobando cuenta…";
      sessionCopy.textContent = "Espera un momento.";
      return;
    }

    if (!state.user) {
      sessionTitle.textContent = "Inicia sesión en ToolHub";
      sessionCopy.textContent = "No necesitas una contraseña de administrador separada. Inicia sesión con tu cuenta normal y volveremos a comprobar el rol automáticamente.";
      const login = document.createElement("a");
      login.className = "toolhub-admin-primary";
      login.href = profileUrl();
      login.textContent = "Iniciar sesión";
      actions.appendChild(login);
      showPrivateCard(false);
      return;
    }

    if (!allowed) {
      sessionBox.classList.add("is-denied");
      sessionTitle.textContent = "Cuenta sin permisos administrativos";
      sessionCopy.textContent = `${state.user.email || "Tu cuenta"} tiene sesión iniciada, pero no posee rol Owner o Admin.`;
      const profile = document.createElement("a");
      profile.className = "toolhub-admin-secondary";
      profile.href = profileUrl();
      profile.textContent = "Abrir mi perfil";
      actions.appendChild(profile);
      showPrivateCard(false);
      return;
    }

    sessionBox.classList.add("is-ok");
    sessionTitle.textContent = `Acceso ${roleLabel(state.role)} activo`;
    sessionCopy.textContent = `${state.user.email || "Cuenta autorizada"} · la gestión administrativa y el almacén privado están habilitados.`;

    const privateLink = document.createElement("a");
    privateLink.className = "toolhub-admin-primary";
    privateLink.href = "biblioteca-assets-privada.html";
    privateLink.textContent = "Abrir almacén privado";
    const publicLink = document.createElement("a");
    publicLink.className = "toolhub-admin-secondary";
    publicLink.href = "biblioteca-assets.html";
    publicLink.textContent = "Gestionar Assets";
    actions.append(privateLink, publicLink);
    showPrivateCard(true);
  }

  async function refreshSession() {
    state.ready = false;
    renderState();
    try {
      if (!window.ToolHubAccount) throw new Error("El sistema de cuentas de ToolHub no está disponible.");
      await window.ToolHubAccount.ready();
      const user = await window.ToolHubAccount.getUser();
      let role = null;

      if (user) {
        const client = await window.ToolHubAccount.getClient();
        const { data, error } = await client
          .from("toolhub_admins")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        role = data?.role || null;
      }

      state.user = user || null;
      state.role = ADMIN_ROLES.has(role) ? role : null;
    } catch (error) {
      console.error("ToolHub admin:", error);
      state.user = null;
      state.role = null;
    } finally {
      state.ready = true;
      renderState();
    }
  }

  function openOverlay() {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    refreshSession();
    setTimeout(() => closeButton.focus({ preventScroll: true }), 20);
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
  document.addEventListener("toolhub-account-changed", refreshSession);

  refreshSession();
})();
