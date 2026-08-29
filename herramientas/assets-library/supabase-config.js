window.TOOLHUB_SUPABASE = Object.freeze({
  // Valores públicos de frontend de Supabase / Turnstile.
  // Nunca pongas aquí service_role, sb_secret_*, Secret Key de Turnstile ni contraseñas privadas.
  url: "https://ntbylihedfkpebhgmfpt.supabase.co",
  publishableKey: "sb_publishable_GxIk_gqhh4SIxLmd7igoVA_v1wPRgsz",
  turnstileSiteKey: "0x4AAAAAAEhH0mTveZlPd-Uo"
});

// Auth 2.0: al cerrar sesión, permanecer siempre en el mismo entorno/origen.
// Esto evita que una Preview de Cloudflare termine en la URL oficial de producción.
(() => {
  const button = document.getElementById("profileLogout");
  if (!button || !window.supabase?.createClient) return;

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const cfg = window.TOOLHUB_SUPABASE;
    const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "toolhub-community-auth-v2",
      }
    });

    try {
      await db.auth.signOut();
    } finally {
      const target = new URL("profile.html", window.location.href);
      target.search = "";
      target.hash = "";
      window.location.replace(target.href);
    }
  }, true);
})();

// Perfil: cargar badges decorativos sin acoplarlos a los permisos administrativos.
(() => {
  if (!document.body?.classList.contains("profile-page")) return;
  if (document.querySelector('script[data-toolhub-profile-badges]')) return;
  const script = document.createElement("script");
  script.src = "profiles/profile-badges.js?v=1";
  script.defer = true;
  script.dataset.toolhubProfileBadges = "1";
  document.body.appendChild(script);
})();
