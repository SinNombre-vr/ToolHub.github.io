(() => {
  "use strict";

  if (!window.supabase?.createClient || window.__TOOLHUB_TURNSTILE_PATCH__) return;
  window.__TOOLHUB_TURNSTILE_PATCH__ = true;

  const cfg = window.TOOLHUB_SUPABASE || {};
  const siteKey = String(cfg.turnstileSiteKey || "").trim();
  if (!siteKey) return;

  const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  let apiPromise = null;

  function loadTurnstile() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
      const finish = () => {
        let attempts = 0;
        const timer = setInterval(() => {
          attempts += 1;
          if (window.turnstile?.render) {
            clearInterval(timer);
            resolve(window.turnstile);
          } else if (attempts >= 100) {
            clearInterval(timer);
            reject(new Error("No se pudo cargar la comprobación anti-bot."));
          }
        }, 50);
      };

      if (existing) {
        finish();
        return;
      }

      const script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.defer = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("No se pudo cargar la comprobación anti-bot."));
      document.head.appendChild(script);
    });

    return apiPromise;
  }

  function ensureChallengeHost() {
    let host = document.getElementById("toolhubTurnstileHost");
    if (host) return host;

    host = document.createElement("div");
    host.id = "toolhubTurnstileHost";
    host.setAttribute("aria-live", "polite");
    host.style.cssText = "display:flex;justify-content:center;align-items:center;width:100%;min-height:0;margin:8px 0 2px;overflow:visible;";

    const message = document.getElementById("authMessage");
    const card = document.querySelector(".profile-auth-card");
    if (message?.parentNode) message.parentNode.insertBefore(host, message);
    else card?.appendChild(host);
    return host;
  }

  function turnstileErrorMessage(code) {
    const value = String(code || "unknown");
    if (value.startsWith("110100")) return `Turnstile rechazó la Site Key (error ${value}).`;
    if (value.startsWith("110110")) return `Turnstile no encuentra la Site Key (error ${value}).`;
    if (value.startsWith("110200")) return `Este dominio no está autorizado en Turnstile (error ${value}). Host: ${location.hostname}`;
    if (value.startsWith("110600")) return `La comprobación Turnstile caducó (error ${value}). Inténtalo de nuevo.`;
    if (value.startsWith("200100")) return `Turnstile detectó un problema de reloj o caché (error ${value}).`;
    if (value.startsWith("200500")) return `No se pudo cargar el iframe de Turnstile (error ${value}).`;
    return `No se pudo completar la comprobación anti-bot (Turnstile ${value}). Recarga la página e inténtalo de nuevo.`;
  }

  async function getCaptchaToken(action) {
    const turnstile = await loadTurnstile();
    const host = ensureChallengeHost();
    if (!host) throw new Error("No se pudo preparar la comprobación anti-bot.");

    host.replaceChildren();

    return new Promise((resolve, reject) => {
      let widgetId = null;
      let settled = false;
      const timeout = setTimeout(() => finish(new Error("La comprobación anti-bot tardó demasiado. Inténtalo de nuevo.")), 45000);

      function cleanup() {
        clearTimeout(timeout);
        if (widgetId !== null) {
          try { turnstile.remove(widgetId); } catch {}
        }
        host.replaceChildren();
      }

      function finish(error, token) {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(token);
      }

      try {
        // El challenge se inicia automáticamente al renderizarse. Es el flujo más
        // simple y estable para una comprobación que nace justo al enviar el formulario.
        widgetId = turnstile.render(host, {
          sitekey: siteKey,
          theme: "dark",
          size: "flexible",
          appearance: "interaction-only",
          action,
          retry: "auto",
          "retry-interval": 3000,
          callback: (token) => finish(null, token),
          "error-callback": (errorCode) => {
            finish(new Error(turnstileErrorMessage(errorCode)));
            return true;
          },
          "expired-callback": () => finish(new Error("La comprobación anti-bot ha caducado. Inténtalo de nuevo.")),
          "timeout-callback": () => finish(new Error("La comprobación anti-bot tardó demasiado. Inténtalo de nuevo.")),
          "unsupported-callback": () => finish(new Error("Este navegador no es compatible con la comprobación anti-bot de Cloudflare.")),
        });
      } catch (error) {
        finish(error instanceof Error ? error : new Error("No se pudo iniciar la comprobación anti-bot."));
      }
    });
  }

  function captchaFailure(error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("No se pudo completar la comprobación anti-bot."),
    };
  }

  function protectAuth(auth) {
    if (!auth || auth.__toolhubTurnstileProtected) return auth;

    const signInWithPassword = auth.signInWithPassword?.bind(auth);
    const signUp = auth.signUp?.bind(auth);
    const resetPasswordForEmail = auth.resetPasswordForEmail?.bind(auth);
    const resend = auth.resend?.bind(auth);
    const signInWithOtp = auth.signInWithOtp?.bind(auth);

    if (signInWithPassword) {
      auth.signInWithPassword = async (credentials) => {
        try {
          const captchaToken = await getCaptchaToken("login");
          return await signInWithPassword({
            ...credentials,
            options: { ...(credentials?.options || {}), captchaToken },
          });
        } catch (error) {
          return captchaFailure(error);
        }
      };
    }

    if (signUp) {
      auth.signUp = async (credentials) => {
        try {
          const captchaToken = await getCaptchaToken("signup");
          return await signUp({
            ...credentials,
            options: { ...(credentials?.options || {}), captchaToken },
          });
        } catch (error) {
          return captchaFailure(error);
        }
      };
    }

    if (resetPasswordForEmail) {
      auth.resetPasswordForEmail = async (email, options = {}) => {
        try {
          const captchaToken = await getCaptchaToken("recovery");
          return await resetPasswordForEmail(email, { ...options, captchaToken });
        } catch (error) {
          return captchaFailure(error);
        }
      };
    }

    if (resend) {
      auth.resend = async (params) => {
        try {
          const captchaToken = await getCaptchaToken("resend");
          return await resend({
            ...params,
            options: { ...(params?.options || {}), captchaToken },
          });
        } catch (error) {
          return captchaFailure(error);
        }
      };
    }

    if (signInWithOtp) {
      auth.signInWithOtp = async (credentials) => {
        try {
          const captchaToken = await getCaptchaToken("email_otp");
          return await signInWithOtp({
            ...credentials,
            options: { ...(credentials?.options || {}), captchaToken },
          });
        } catch (error) {
          return captchaFailure(error);
        }
      };
    }

    try {
      Object.defineProperty(auth, "__toolhubTurnstileProtected", { value: true });
    } catch {}
    return auth;
  }

  window.supabase.createClient = (...args) => {
    const client = originalCreateClient(...args);
    protectAuth(client.auth);
    return client;
  };

  window.ToolHubTurnstile = Object.freeze({
    siteKey,
    getToken: getCaptchaToken,
  });
})();
