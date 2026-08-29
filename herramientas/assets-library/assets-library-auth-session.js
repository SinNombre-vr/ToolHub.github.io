(() => {
  "use strict";

  if (window.__TOOLHUB_ASSET_AUTH_SESSION__) return;
  window.__TOOLHUB_ASSET_AUTH_SESSION__ = true;

  const ADMIN_ROLES = new Set(["owner", "admin"]);
  const scriptUrl = document.currentScript?.src || location.href;
  const accountUrl = new URL("../../toolhub-user.js?v=3", scriptUrl).href;

  function ensureAccountModule() {
    if (window.ToolHubAccount) return Promise.resolve(window.ToolHubAccount);
    return new Promise((resolve, reject) => {
      let script = document.querySelector("script[data-toolhub-user]");
      if (!script) {
        script = document.createElement("script");
        script.src = accountUrl;
        script.defer = true;
        script.setAttribute("data-toolhub-user", "1");
        document.head.appendChild(script);
      }

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.ToolHubAccount) {
          clearInterval(timer);
          resolve(window.ToolHubAccount);
        } else if (attempts > 120) {
          clearInterval(timer);
          reject(new Error("No se pudo cargar el sistema de cuentas de ToolHub."));
        }
      }, 50);
    });
  }

  function profileUrl() {
    const base = window.ToolHubAccount?.profileUrl || new URL("../../profile.html", scriptUrl).href;
    const url = new URL(base);
    url.searchParams.set("next", location.href);
    return url.href;
  }

  function prepareDialog() {
    const card = document.getElementById("adminForm");
    if (!card || card.dataset.sessionAuth === "1") return;
    card.dataset.sessionAuth = "1";
    card.innerHTML = `
      <button class="asset-dialog-close" value="cancel" aria-label="Cerrar">×</button>
      <span class="asset-panel-kicker">ADMINISTRACIÓN</span>
      <h2>Panel de administración</h2>
      <p>Este panel usa tu sesión normal de ToolHub. Solo las cuentas con rol <strong>Owner</strong> o <strong>Admin</strong> reciben herramientas de gestión.</p>
      <div class="asset-admin-status" id="adminStatus">🔒 Comprobando permisos…</div>
      <div class="asset-admin-message" id="adminMessage" aria-live="polite"></div>
      <div class="asset-admin-actions" id="toolhubAdminSessionActions"></div>
    `;
  }

  function renderSessionUi(user, role) {
    const status = document.getElementById("adminStatus");
    const message = document.getElementById("adminMessage");
    const actions = document.getElementById("toolhubAdminSessionActions");
    if (!status || !message || !actions) return;

    actions.replaceChildren();
    message.className = "asset-admin-message";
    const allowed = Boolean(user && ADMIN_ROLES.has(role));
    status.classList.toggle("unlocked", allowed);

    if (!user) {
      status.textContent = "🔒 Administrador bloqueado · inicia sesión en ToolHub";
      message.textContent = "No existe un login de administrador separado. Inicia sesión con tu cuenta normal para comprobar tus permisos.";
      const login = document.createElement("a");
      login.className = "asset-primary";
      login.href = profileUrl();
      login.textContent = "Iniciar sesión en ToolHub";
      actions.appendChild(login);
      return;
    }

    if (!allowed) {
      status.textContent = "🔒 Cuenta sin permisos administrativos";
      message.textContent = `${user.email || "La cuenta actual"} no tiene rol Owner o Admin.`;
      message.classList.add("error");
      const profile = document.createElement("a");
      profile.className = "asset-secondary";
      profile.href = profileUrl();
      profile.textContent = "Abrir mi perfil";
      actions.appendChild(profile);
      return;
    }

    const label = role === "owner" ? "Owner" : "Admin";
    status.textContent = `🔓 ${label} activo${user.email ? ` · ${user.email}` : ""}`;
    message.textContent = "Las herramientas de gestión están habilitadas con tu sesión actual.";
    message.classList.add("ok");

    const profile = document.createElement("a");
    profile.className = "asset-secondary";
    profile.href = profileUrl();
    profile.textContent = "Mi perfil";
    actions.appendChild(profile);
  }

  async function mirrorSessionIntoLibrary(account, api) {
    const accountClient = await account.getClient();
    const libraryClient = api.getDb();
    if (!libraryClient) return accountClient;

    const { data } = await accountClient.auth.getSession();
    const session = data?.session || null;
    if (session?.access_token && session?.refresh_token) {
      const { error } = await libraryClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) throw error;
    } else {
      try { await libraryClient.auth.signOut({ scope: "local" }); } catch {}
    }
    return accountClient;
  }

  async function syncAccess() {
    prepareDialog();
    const api = window.ToolHubAssets;
    if (!api) return false;

    try {
      const account = await ensureAccountModule();
      await account.ready();
      const user = await account.getUser();
      const client = await mirrorSessionIntoLibrary(account, api);
      let role = null;

      if (user) {
        const { data, error } = await client
          .from("toolhub_admins")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        role = data?.role || null;
      }

      const state = api.getState();
      const allowed = Boolean(user && ADMIN_ROLES.has(role));
      state.adminUnlocked = allowed;
      state.adminUser = allowed ? user : null;
      state.adminRole = allowed ? role : null;
      api.render();
      renderSessionUi(user, role);
      document.dispatchEvent(new CustomEvent("toolhub-admin-changed", {
        detail: { unlocked: allowed, role: allowed ? role : null, user: allowed ? user : null },
      }));
      return true;
    } catch (error) {
      console.error("ToolHub Assets admin session:", error);
      const state = api.getState();
      state.adminUnlocked = false;
      state.adminUser = null;
      state.adminRole = null;
      api.render();
      renderSessionUi(null, null);
      return true;
    }
  }

  prepareDialog();

  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    if (await syncAccess() || attempts > 120) clearInterval(timer);
  }, 50);

  document.addEventListener("toolhub-account-changed", () => setTimeout(syncAccess, 0));
  document.addEventListener("toolhub-assets-ready", () => setTimeout(syncAccess, 0));
})();
