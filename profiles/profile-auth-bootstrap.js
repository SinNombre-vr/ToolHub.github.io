(() => {
  "use strict";

  const STORAGE_KEY = "toolhub-community-auth-v2";
  if (!window.supabase?.createClient || window.__TOOLHUB_PROFILE_AUTH_BOOTSTRAP__) return;
  window.__TOOLHUB_PROFILE_AUTH_BOOTSTRAP__ = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  window.supabase.createClient = (url, key, options = {}) => {
    const auth = {
      ...(options.auth || {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: STORAGE_KEY,
    };

    return originalCreateClient(url, key, { ...options, auth });
  };
})();
