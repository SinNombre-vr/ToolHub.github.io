(() => {
  "use strict";

  if (window.__TOOLHUB_PRIVATE_AUTH2__) return;
  window.__TOOLHUB_PRIVATE_AUTH2__ = true;

  const STORAGE_KEY = "toolhub-community-auth-v2";
  if (!window.supabase?.createClient) return;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient = (url, key, options = {}) => originalCreateClient(url, key, {
    ...options,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(options.auth || {}),
      storageKey: STORAGE_KEY,
    },
  });
})();
