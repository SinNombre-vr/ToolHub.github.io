(() => {
  "use strict";

  const STORAGE_KEY = "toolhub-community-auth-v2";
  const PENDING_EMAIL_KEY = "toolhub-auth2-pending-email";
  const LAST_EMAIL_SENT_AT_KEY = "toolhub-auth2-last-email-at";
  const RESEND_COOLDOWN_SECONDS = 60;
  const OTP_MIN_LENGTH = 6;
  const OTP_MAX_LENGTH = 10;

  if (!window.supabase?.createClient || window.__TOOLHUB_AUTH2_BOOTSTRAP__) return;
  window.__TOOLHUB_AUTH2_BOOTSTRAP__ = true;

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

  const cfg = window.TOOLHUB_SUPABASE || {};
  if (!cfg.url || !cfg.publishableKey) return;

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let pendingEmail = "";
  let resendTimer = null;
  let providerState = { discord: false, google: false };

  function setMessage(text, mode = "") {
    const el = $("#authMessage");
    if (!el) return;
    el.textContent = text || "";
    el.className = "profile-message" + (mode ? ` ${mode}` : "");
  }

  function friendlyAuthError(error, fallback = "No se pudo completar la operación.") {
    const message = String(error?.message || "");
    const seconds = message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
    if (seconds) return `Por seguridad, espera ${seconds} segundos antes de intentarlo de nuevo.`;
    if (/rate limit|too many requests/i.test(message)) return "Has realizado demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
    if (/invalid login credentials/i.test(message)) return "El correo o la contraseña no son correctos.";
    if (/email not confirmed/i.test(message)) return "Tu correo todavía no está verificado.";
    if (/user already registered/i.test(message)) return "Ya existe una cuenta con ese correo.";
    if (/password/i.test(message) && /weak|short|characters/i.test(message)) return "La contraseña no cumple los requisitos de seguridad.";
    return message || fallback;
  }

  function maskEmail(email) {
    const [local, domain] = String(email || "").split("@");
    if (!domain) return email || "";
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
  }

  function savePendingEmail(email) {
    pendingEmail = String(email || "").trim().toLowerCase();
    try { sessionStorage.setItem(PENDING_EMAIL_KEY, pendingEmail); } catch {}
  }

  function loadPendingEmail() {
    if (pendingEmail) return pendingEmail;
    try { pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY) || ""; } catch {}
    return pendingEmail;
  }

  function clearPendingEmail() {
    pendingEmail = "";
    try {
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      sessionStorage.removeItem(LAST_EMAIL_SENT_AT_KEY);
    } catch {}
  }

  function markEmailSent() {
    try { sessionStorage.setItem(LAST_EMAIL_SENT_AT_KEY, String(Date.now())); } catch {}
  }

  function remainingCooldown() {
    try {
      const sentAt = Number(sessionStorage.getItem(LAST_EMAIL_SENT_AT_KEY) || 0);
      return Math.max(0, Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - sentAt)) / 1000));
    } catch { return 0; }
  }

  function startResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
    clearInterval(resendTimer);
    const button = $("#authOtpResend");
    if (!button) return;
    let remaining = Math.max(0, Math.ceil(Number(seconds) || 0));
    if (!remaining) {
      button.disabled = false;
      button.textContent = "Reenviar código";
      return;
    }
    button.disabled = true;
    button.textContent = `Reenviar en ${remaining}s`;
    resendTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(resendTimer);
        button.disabled = false;
        button.textContent = "Reenviar código";
      } else {
        button.textContent = `Reenviar en ${remaining}s`;
      }
    }, 1000);
  }

  function injectAuth2Styles() {
    if ($("#toolhubAuth2Styles")) return;
    const style = document.createElement("style");
    style.id = "toolhubAuth2Styles";
    style.textContent = `
      .profile-auth-card{overflow:hidden}
      .auth2-social{display:grid;gap:9px;margin:4px 0 14px}
      .auth2-provider{width:100%;min-height:46px;border:1px solid var(--border);border-radius:11px;background:var(--bg-soft);color:var(--text);font:inherit;font-weight:850;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:.18s ease}
      .auth2-provider:hover:not(:disabled){transform:translateY(-1px);border-color:rgba(111,86,255,.58);box-shadow:0 0 22px rgba(69,121,255,.10)}
      .auth2-provider:disabled{opacity:.52;cursor:not-allowed}
      .auth2-provider-icon{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;font-weight:950}
      .auth2-provider.discord .auth2-provider-icon{background:#5865f2;color:white}
      .auth2-provider.google .auth2-provider-icon{background:#fff;color:#202124}
      .auth2-provider-status{min-height:17px;color:var(--muted);font-size:.69rem;line-height:1.45;text-align:center}
      .auth2-divider{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.69rem;font-weight:800;margin:3px 0 14px}
      .auth2-divider::before,.auth2-divider::after{content:"";height:1px;flex:1;background:var(--border)}
      .auth2-link{appearance:none;border:0;background:transparent;padding:0;color:#7db8ff;cursor:pointer;font:inherit;font-size:.76rem;font-weight:800;text-align:left}
      .auth2-link:hover{text-decoration:underline}
      .auth2-login-extra{display:flex;justify-content:flex-end;margin-top:-4px}
      .auth2-password-wrap{position:relative}
      .auth2-password-wrap input{padding-right:48px!important}
      .auth2-eye{position:absolute;right:9px;bottom:7px;width:34px;height:34px;border:0;background:transparent;color:var(--muted);cursor:pointer;border-radius:8px}
      .auth2-eye:hover{background:rgba(255,255,255,.045);color:var(--text)}
      .auth2-form{display:grid;gap:14px}
      .auth2-form[hidden],.auth2-social[hidden],.auth2-divider[hidden]{display:none!important}
      .auth2-form-head{display:grid;gap:6px}
      .auth2-form-head h2{margin:0;font-size:1.55rem}
      .auth2-form-head p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.55}
      .auth2-code{min-height:56px;text-align:center;font-size:1.45rem!important;font-weight:950;letter-spacing:.22em;font-variant-numeric:tabular-nums}
      .auth2-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .auth2-secondary{min-height:41px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft);color:var(--muted);font-weight:800;cursor:pointer}
      .auth2-secondary:hover:not(:disabled){color:var(--text);border-color:rgba(111,86,255,.45)}
      .auth2-security{padding:10px 12px;border:1px solid rgba(92,116,255,.18);border-radius:10px;background:rgba(83,85,255,.05);color:var(--muted);font-size:.69rem;line-height:1.5}
      .auth2-password-hint{display:block;color:var(--muted);font-size:.67rem;margin-top:5px}
      @media(max-width:520px){.auth2-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function enhancePasswordField(input) {
    if (!input || input.closest(".auth2-password-wrap")) return;
    const label = input.closest("label");
    if (!label) return;
    const wrap = document.createElement("div");
    wrap.className = "auth2-password-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "auth2-eye";
    eye.setAttribute("aria-label", "Mostrar contraseña");
    eye.textContent = "◉";
    eye.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      eye.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
    });
    wrap.appendChild(eye);
  }

  function buildAuth2Ui() {
    injectAuth2Styles();
    const card = $(".profile-auth-card");
    const login = $("#profileLoginForm");
    const register = $("#profileRegisterForm");
    const message = $("#authMessage");
    if (!card || !login || !register || !message) return false;

    if (!$("#auth2Social")) {
      const social = document.createElement("div");
      social.id = "auth2Social";
      social.className = "auth2-social";
      social.innerHTML = `
        <button class="auth2-provider discord" id="authDiscord" type="button" disabled><span class="auth2-provider-icon">D</span><span>Continuar con Discord</span></button>
        <button class="auth2-provider google" id="authGoogle" type="button" disabled><span class="auth2-provider-icon">G</span><span>Continuar con Google</span></button>
        <div class="auth2-provider-status" id="authProviderStatus">Comprobando métodos de acceso…</div>
      `;
      card.insertBefore(social, login);

      const divider = document.createElement("div");
      divider.id = "auth2Divider";
      divider.className = "auth2-divider";
      divider.textContent = "o continúa con email";
      card.insertBefore(divider, login);
    }

    if (!$("#authForgotPassword")) {
      const extra = document.createElement("div");
      extra.className = "auth2-login-extra";
      extra.innerHTML = `<button class="auth2-link" id="authForgotPassword" type="button">¿Olvidaste tu contraseña?</button>`;
      const submit = $("button[type=submit]", login);
      login.insertBefore(extra, submit);
    }

    const registerPassword = $("#registerPassword");
    if (registerPassword && !$("#authPasswordHint")) {
      const hint = document.createElement("small");
      hint.id = "authPasswordHint";
      hint.className = "auth2-password-hint";
      hint.textContent = "Mínimo 8 caracteres. Evita reutilizar contraseñas de otros servicios.";
      registerPassword.closest("label")?.appendChild(hint);
    }

    enhancePasswordField($("#loginPassword"));
    enhancePasswordField(registerPassword);

    if (!$("#authOtpForm")) {
      const otp = document.createElement("form");
      otp.id = "authOtpForm";
      otp.className = "auth2-form";
      otp.hidden = true;
      otp.innerHTML = `
        <div class="auth2-form-head"><span class="profile-kicker">VERIFICACIÓN</span><h2>Introduce el código</h2><p>Hemos enviado un código a <strong id="authOtpEmail"></strong>.</p></div>
        <label><span>Código de verificación</span><input class="profile-otp-input auth2-code" id="authOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required placeholder="000000"></label>
        <button class="button primary" id="authOtpVerify" type="submit">Verificar cuenta</button>
        <div class="auth2-actions"><button class="auth2-secondary" id="authOtpResend" type="button">Reenviar código</button><button class="auth2-secondary" id="authOtpBack" type="button">Volver</button></div>
        <div class="auth2-security">🔐 Las funciones privadas de ToolHub permanecen bloqueadas hasta confirmar que el correo te pertenece.</div>`;
      card.insertBefore(otp, message);
    }

    if (!$("#authRecoveryForm")) {
      const form = document.createElement("form");
      form.id = "authRecoveryForm";
      form.className = "auth2-form";
      form.hidden = true;
      form.innerHTML = `
        <div class="auth2-form-head"><span class="profile-kicker">RECUPERAR ACCESO</span><h2>Restablecer contraseña</h2><p>Te enviaremos un enlace seguro para elegir una contraseña nueva.</p></div>
        <label><span>Email</span><input id="authRecoveryEmail" type="email" autocomplete="email" required placeholder="tu@email.com"></label>
        <button class="button primary" type="submit">Enviar enlace</button>
        <button class="auth2-secondary" id="authRecoveryBack" type="button">Volver a iniciar sesión</button>`;
      card.insertBefore(form, message);
    }

    if (!$("#authNewPasswordForm")) {
      const form = document.createElement("form");
      form.id = "authNewPasswordForm";
      form.className = "auth2-form";
      form.hidden = true;
      form.innerHTML = `
        <div class="auth2-form-head"><span class="profile-kicker">NUEVA CONTRASEÑA</span><h2>Protege tu cuenta</h2><p>Elige una contraseña nueva para terminar la recuperación.</p></div>
        <label><span>Nueva contraseña</span><input id="authNewPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo 8 caracteres"></label>
        <label><span>Repetir contraseña</span><input id="authNewPasswordRepeat" type="password" autocomplete="new-password" minlength="8" required placeholder="Repite la contraseña"></label>
        <button class="button primary" type="submit">Guardar contraseña</button>`;
      card.insertBefore(form, message);
      enhancePasswordField($("#authNewPassword"));
      enhancePasswordField($("#authNewPasswordRepeat"));
    }

    return true;
  }

  function showMode(mode = "login") {
    const modes = ["login", "register", "otp", "recovery", "new-password"];
    if (!modes.includes(mode)) mode = "login";
    const login = $("#profileLoginForm");
    const register = $("#profileRegisterForm");
    const otp = $("#authOtpForm");
    const recovery = $("#authRecoveryForm");
    const newPassword = $("#authNewPasswordForm");
    const social = $("#auth2Social");
    const divider = $("#auth2Divider");
    const tabs = $(".profile-auth-tabs");

    if (login) login.hidden = mode !== "login";
    if (register) register.hidden = mode !== "register";
    if (otp) otp.hidden = mode !== "otp";
    if (recovery) recovery.hidden = mode !== "recovery";
    if (newPassword) newPassword.hidden = mode !== "new-password";
    if (social) social.hidden = !["login", "register"].includes(mode);
    if (divider) divider.hidden = !["login", "register"].includes(mode);
    if (tabs) tabs.hidden = !["login", "register"].includes(mode);

    $$('[data-auth-tab]').forEach((button) => {
      const active = button.dataset.authTab === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    if (mode === "otp") {
      const email = loadPendingEmail();
      const target = $("#authOtpEmail");
      if (target) target.textContent = maskEmail(email);
      const code = $("#authOtpCode");
      if (code) { code.value = ""; setTimeout(() => code.focus(), 0); }
    }
  }

  async function syncVerification() {
    try {
      const { error } = await db.rpc("toolhub_sync_auth_verification");
      if (!error) return true;
    } catch {}
    try {
      const { error } = await db.rpc("toolhub_mark_email_verified");
      return !error;
    } catch { return false; }
  }

  async function refreshProviders() {
    const discord = $("#authDiscord");
    const google = $("#authGoogle");
    const status = $("#authProviderStatus");
    try {
      const response = await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.publishableKey } });
      if (!response.ok) throw new Error("settings unavailable");
      const data = await response.json();
      providerState.discord = Boolean(data?.external?.discord);
      providerState.google = Boolean(data?.external?.google);
    } catch {
      providerState = { discord: false, google: false };
    }
    if (discord) discord.disabled = !providerState.discord;
    if (google) google.disabled = !providerState.google;
    if (status) {
      const enabled = [providerState.discord && "Discord", providerState.google && "Google"].filter(Boolean);
      status.textContent = enabled.length ? `${enabled.join(" y ")} disponibles.` : "Discord y Google están preparados; falta activar sus credenciales.";
    }
  }

  async function socialLogin(provider) {
    if (!providerState[provider]) return;
    setMessage(`Conectando con ${provider === "discord" ? "Discord" : "Google"}…`);
    const redirectTo = new URL("profile.html?auth=callback", location.href).href;
    const { error } = await db.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setMessage(friendlyAuthError(error, "No se pudo iniciar el acceso social."), "error");
  }

  async function handleLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $("#loginEmail")?.value.trim().toLowerCase() || "";
    const password = $("#loginPassword")?.value || "";
    const submit = $("#profileLoginForm button[type=submit]");
    if (!email || !password) return;
    if (submit) submit.disabled = true;
    setMessage("Entrando…");
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (submit) submit.disabled = false;
    if (error || !data?.user) {
      if (/confirm|verified|verification/i.test(error?.message || "")) {
        savePendingEmail(email);
        showMode("otp");
        setMessage("Tu cuenta existe, pero todavía debes verificar el correo. Usa el código recibido o solicita uno nuevo.", "error");
        const cooldown = remainingCooldown();
        if (cooldown) startResendCooldown(cooldown);
        return;
      }
      return setMessage(friendlyAuthError(error, "No se pudo iniciar sesión."), "error");
    }
    await syncVerification();
    clearPendingEmail();
    setMessage("Sesión iniciada.", "ok");
  }

  async function handleRegister(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const username = $("#registerUsername")?.value.trim() || "";
    const displayName = $("#registerDisplayName")?.value.trim() || "";
    const email = $("#registerEmail")?.value.trim().toLowerCase() || "";
    const password = $("#registerPassword")?.value || "";
    const submit = $("#profileRegisterForm button[type=submit]");
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return setMessage("El usuario debe tener entre 3 y 32 caracteres válidos.", "error");
    if (!email) return setMessage("Introduce un correo válido.", "error");
    if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.", "error");
    if (submit) submit.disabled = true;
    setMessage("Creando tu cuenta…");
    const { data, error } = await db.auth.signUp({ email, password, options: { data: { username, display_name: displayName, name: displayName } } });
    if (submit) submit.disabled = false;
    if (error) return setMessage(friendlyAuthError(error, "No se pudo crear la cuenta."), "error");
    if (data?.session) {
      await syncVerification();
      setMessage("Cuenta creada y sesión iniciada.", "ok");
      return;
    }
    savePendingEmail(email);
    markEmailSent();
    showMode("otp");
    startResendCooldown();
    setMessage("Cuenta creada. Introduce el código que hemos enviado a tu correo.", "ok");
  }

  async function resendCode() {
    const email = loadPendingEmail();
    if (!email) return setMessage("No encontramos un correo pendiente.", "error");
    const button = $("#authOtpResend");
    if (button) button.disabled = true;
    setMessage("Enviando un código nuevo…");
    const { error } = await db.auth.resend({ type: "signup", email });
    if (error) {
      const wait = Number(String(error.message || "").match(/after\s+(\d+)\s+seconds?/i)?.[1] || 0);
      if (wait) startResendCooldown(wait); else if (button) button.disabled = false;
      return setMessage(friendlyAuthError(error, "No se pudo reenviar el código."), "error");
    }
    markEmailSent();
    startResendCooldown();
    setMessage("Código reenviado. Revisa también Spam o Correo no deseado.", "ok");
  }

  async function verifyCode(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = loadPendingEmail();
    const code = $("#authOtpCode")?.value.replace(/\D/g, "") || "";
    const button = $("#authOtpVerify");
    if (!email) return setMessage("No encontramos el correo pendiente. Vuelve al registro.", "error");
    if (code.length < OTP_MIN_LENGTH || code.length > OTP_MAX_LENGTH) return setMessage("Introduce el código completo del correo.", "error");
    if (button) button.disabled = true;
    setMessage("Verificando código…");
    const { error } = await db.auth.verifyOtp({ email, token: code, type: "email" });
    if (button) button.disabled = false;
    if (error) return setMessage("El código no es válido o ha caducado.", "error");
    await syncVerification();
    clearPendingEmail();
    setMessage("✓ Correo verificado. Activando tu perfil…", "ok");
    setTimeout(() => location.reload(), 450);
  }

  async function sendRecovery(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $("#authRecoveryEmail")?.value.trim().toLowerCase() || "";
    const submit = $("#authRecoveryForm button[type=submit]");
    if (!email) return;
    if (submit) submit.disabled = true;
    setMessage("Preparando recuperación…");
    const redirectTo = new URL("profile.html?mode=recovery", location.href).href;
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
    if (submit) submit.disabled = false;
    if (error) return setMessage(friendlyAuthError(error, "No se pudo enviar el correo de recuperación."), "error");
    setMessage("Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.", "ok");
  }

  async function saveNewPassword(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const password = $("#authNewPassword")?.value || "";
    const repeat = $("#authNewPasswordRepeat")?.value || "";
    if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.", "error");
    if (password !== repeat) return setMessage("Las contraseñas no coinciden.", "error");
    const submit = $("#authNewPasswordForm button[type=submit]");
    if (submit) submit.disabled = true;
    setMessage("Actualizando contraseña…");
    const { error } = await db.auth.updateUser({ password });
    if (submit) submit.disabled = false;
    if (error) return setMessage(friendlyAuthError(error, "No se pudo cambiar la contraseña."), "error");
    setMessage("✓ Contraseña actualizada correctamente.", "ok");
    setTimeout(() => location.replace(new URL("profile.html", location.href).href), 700);
  }

  function bindEvents() {
    $$('[data-auth-tab]').forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMessage("");
      showMode(button.dataset.authTab);
    }, true));

    $("#profileLoginForm")?.addEventListener("submit", handleLogin, true);
    $("#profileRegisterForm")?.addEventListener("submit", handleRegister, true);
    $("#authOtpForm")?.addEventListener("submit", verifyCode, true);
    $("#authRecoveryForm")?.addEventListener("submit", sendRecovery, true);
    $("#authNewPasswordForm")?.addEventListener("submit", saveNewPassword, true);
    $("#authDiscord")?.addEventListener("click", () => socialLogin("discord"));
    $("#authGoogle")?.addEventListener("click", () => socialLogin("google"));
    $("#authForgotPassword")?.addEventListener("click", () => { setMessage(""); showMode("recovery"); });
    $("#authRecoveryBack")?.addEventListener("click", () => { setMessage(""); showMode("login"); });
    $("#authOtpBack")?.addEventListener("click", () => { setMessage(""); showMode("login"); });
    $("#authOtpResend")?.addEventListener("click", resendCode);
    $("#authOtpCode")?.addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH); });
  }

  async function init() {
    if (!buildAuth2Ui()) return;
    bindEvents();
    await refreshProviders();

    const { data: sessionData } = await db.auth.getSession();
    if (sessionData?.session) await syncVerification();

    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "recovery") {
      showMode("new-password");
      setMessage("Abre esta pantalla desde el enlace de recuperación recibido por email.");
      return;
    }

    const email = loadPendingEmail();
    if (email) {
      showMode("otp");
      const cooldown = remainingCooldown();
      if (cooldown) startResendCooldown(cooldown);
    } else {
      showMode("login");
    }
  }

  db.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") {
      showMode("new-password");
      setMessage("Sesión de recuperación verificada. Elige una contraseña nueva.", "ok");
    }
    if (event === "SIGNED_IN") await syncVerification();
  });

  window.ToolHubAuth2 = { db, showMode, refreshProviders, syncVerification };
  init();
})();