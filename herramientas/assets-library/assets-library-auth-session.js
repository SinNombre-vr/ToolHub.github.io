(() => {
  "use strict";

  if (window.__TOOLHUB_ASSET_AUTH_SESSION__) return;
  window.__TOOLHUB_ASSET_AUTH_SESSION__ = true;

  const STORAGE_KEY = "toolhub-community-auth-v2";
  const ADMIN_ROLES = new Set(["owner", "admin"]);

  if (window.supabase?.createClient && !window.__TOOLHUB_ASSET_CREATECLIENT_PATCH__) {
    window.__TOOLHUB_ASSET_CREATECLIENT_PATCH__ = true;
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    window.supabase.createClient = (url, key, options = {}) => originalCreateClient(url, key, {
      ...options,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(options.auth || {}),
        storageKey: options.auth?.storageKey || STORAGE_KEY,
      },
    });
  }

  function profileUrl() {
    const base = window.ToolHubAccount?.profileUrl || new URL("profile.html", location.href).href;
    const url = new URL(base);
    url.searchParams.set("next", location.href);
    return url.href;
  }

  function prepareDialog() {
    const dialog = document.getElementById("adminDialog");
    const card = document.getElementById("adminForm");
    if (!dialog || !card || card.dataset.sessionAuth === "1") return;
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
      message.className = "asset-admin-message error";
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
    message.className = "asset-admin-message ok";

    const profile = document.createElement("a");
    profile.className = "asset-secondary";
    profile.href = profileUrl();
    profile.textContent = "Mi perfil";
    actions.appendChild(profile);
  }

  async function syncAccess() {
    prepareDialog();
    const api = window.ToolHubAssets;
    const account = window.ToolHubAccount;
    if (!api || !account) return false;

    try {
      await account.ready();
      const user = await account.getUser();
      let role = null;

      if (user) {
        const client = await account.getClient();
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
    if (await syncAccess() || attempts > 100) clearInterval(timer);
  }, 50);

  document.addEventListener("toolhub-account-changed", () => setTimeout(syncAccess, 0));
  document.addEventListener("toolhub-assets-ready", () => setTimeout(syncAccess, 0));
})();
