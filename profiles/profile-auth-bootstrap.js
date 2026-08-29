(() => {
  "use strict";

  const STORAGE_KEY = "toolhub-community-auth-v2";
  const PENDING_EMAIL_KEY = "toolhub-pending-email-verification";
  const LAST_EMAIL_SENT_AT_KEY = "toolhub-last-verification-email-at";
  const RESEND_COOLDOWN_SECONDS = 60;
  const OTP_MIN_LENGTH = 6;
  const OTP_MAX_LENGTH = 10;

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

  const cfg = window.TOOLHUB_SUPABASE || {};
  if (!cfg.url || !cfg.publishableKey) return;

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  let pendingEmail = "";
  let resendTimer = null;

  function setMessage(text, mode = "") {
    const el = $("#authMessage");
    if (!el) return;
    el.textContent = text || "";
    el.className = "profile-message" + (mode ? ` ${mode}` : "");
  }

  function maskEmail(email) {
    const [local, domain] = String(email || "").split("@");
    if (!domain) return email || "";
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
  }

  function savePendingEmail(email) {
    pendingEmail = email;
    try { sessionStorage.setItem(PENDING_EMAIL_KEY, email); } catch {}
  }

  function loadPendingEmail() {
    if (pendingEmail) return pendingEmail;
    try { pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY) || ""; } catch {}
    return pendingEmail;
  }

  function markEmailSent() {
    try { sessionStorage.setItem(LAST_EMAIL_SENT_AT_KEY, String(Date.now())); } catch {}
  }

  function remainingCooldown() {
    try {
      const sentAt = Number(sessionStorage.getItem(LAST_EMAIL_SENT_AT_KEY) || 0);
      if (!sentAt) return 0;
      return Math.max(0, Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - sentAt)) / 1000));
    } catch {
      return 0;
    }
  }

  function clearPendingEmail() {
    pendingEmail = "";
    try {
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      sessionStorage.removeItem(LAST_EMAIL_SENT_AT_KEY);
    } catch {}
  }

  function friendlyAuthError(error, fallback = "No se pudo completar la operación.") {
    const message = String(error?.message || "");
    const seconds = message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
    if (seconds) return `Por seguridad, espera ${seconds} segundos antes de solicitar otro código.`;
    if (/rate limit|too many requests/i.test(message)) return "Has solicitado demasiados códigos. Espera un momento antes de intentarlo de nuevo.";
    if (/email not confirmed/i.test(message)) return "Tu correo todavía no está verificado.";
    return message || fallback;
  }

  function injectStyles() {
    if ($("#toolhubOtpStyles")) return;
    const style = document.createElement("style");
    style.id = "toolhubOtpStyles";
    style.textContent = `
      .profile-otp-form{display:grid;gap:14px}
      .profile-otp-head{display:grid;gap:7px}
      .profile-otp-head h2{margin:0;font-size:1.65rem}
      .profile-otp-head p{margin:0;color:var(--muted);font-size:.8rem;line-height:1.55}
      .profile-otp-email{color:#b7a8ff;font-weight:800}
      .profile-otp-input{width:100%;min-height:54px;padding:0 14px;border:1px solid var(--border);border-radius:11px;background:var(--bg-soft);color:var(--text);outline:none;text-align:center;font-size:1.45rem;font-weight:900;letter-spacing:.22em;font-variant-numeric:tabular-nums}
      .profile-otp-input:focus{border-color:rgba(133,98,255,.7);box-shadow:0 0 0 3px rgba(119,82,255,.09)}
      .profile-otp-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .profile-otp-secondary{min-height:40px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft);color:var(--muted);cursor:pointer;font-weight:800}
      .profile-otp-secondary:hover:not(:disabled){color:var(--text);border-color:rgba(133,98,255,.42)}
      .profile-otp-secondary:disabled{cursor:not-allowed;opacity:.55}
      .profile-otp-security{padding:11px 12px;border:1px solid rgba(117,91,255,.18);border-radius:11px;background:rgba(103,72,255,.055);color:var(--muted);font-size:.72rem;line-height:1.5}
      .profile-auth-card.is-verifying .profile-auth-tabs,.profile-auth-card.is-verifying .profile-auth-note{display:none!important}
      @media(max-width:520px){.profile-otp-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureVerifyForm() {
    let form = $("#profileOtpForm");
    if (form) return form;

    const card = $(".profile-auth-card");
    const message = $("#authMessage");
    if (!card || !message) return null;

    form = document.createElement("form");
    form.id = "profileOtpForm";
    form.className = "profile-otp-form";
    form.hidden = true;
    form.innerHTML = `
      <div class="profile-otp-head">
        <span class="profile-kicker">VERIFICACIÓN DE EMAIL</span>
        <h2>Introduce el código</h2>
        <p>Hemos enviado un código de verificación a <span class="profile-otp-email" id="profileOtpEmail"></span>.</p>
      </div>
      <label>
        <span style="display:block;margin-bottom:7px;color:var(--muted);font-size:.79rem;font-weight:800">Código de verificación</span>
        <input class="profile-otp-input" id="profileOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]{6,10}" placeholder="Código" required aria-label="Código de verificación">
      </label>
      <button class="button primary" id="profileOtpVerify" type="submit">Verificar cuenta</button>
      <div class="profile-otp-actions">
        <button class="profile-otp-secondary" id="profileOtpResend" type="button">Reenviar código</button>
        <button class="profile-otp-secondary" id="profileOtpBack" type="button">Volver</button>
      </div>
      <div class="profile-otp-security">🔐 Tu perfil, favoritos, colecciones, contribuciones y publicaciones permanecen bloqueados hasta confirmar que el correo te pertenece.</div>
    `;

    card.insertBefore(form, message);
    form.addEventListener("submit", verifyCode, true);
    $("#profileOtpResend", form)?.addEventListener("click", resendCode);
    $("#profileOtpBack", form)?.addEventListener("click", () => showAuth("login"));
    $("#profileOtpCode", form)?.addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, OTP_MAX_LENGTH);
    });
    return form;
  }

  function showAuth(tab = "login") {
    const card = $(".profile-auth-card");
    const otp = ensureVerifyForm();
    card?.classList.remove("is-verifying");
    if (otp) otp.hidden = true;

    const login = $("#profileLoginForm");
    const register = $("#profileRegisterForm");
    if (login) login.hidden = tab !== "login";
    if (register) register.hidden = tab !== "register";
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      const active = button.dataset.authTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function showVerification(email) {
    injectStyles();
    const form = ensureVerifyForm();
    if (!form) return;
    savePendingEmail(email);
    $(".profile-auth-card")?.classList.add("is-verifying");

    const login = $("#profileLoginForm");
    const register = $("#profileRegisterForm");
    if (login) login.hidden = true;
    if (register) register.hidden = true;
    form.hidden = false;

    const emailEl = $("#profileOtpEmail", form);
    if (emailEl) emailEl.textContent = maskEmail(email);
    const code = $("#profileOtpCode", form);
    if (code) { code.value = ""; setTimeout(() => code.focus(), 0); }
    setMessage("Revisa también Spam o Correo no deseado si no ves el código en la bandeja de entrada.");
  }

  function startResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
    clearInterval(resendTimer);
    const button = $("#profileOtpResend");
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
        return;
      }
      button.textContent = `Reenviar en ${remaining}s`;
    }, 1000);
  }

  async function resendSignupCode(email) {
    const { error } = await db.auth.resend({ type: "signup", email });
    if (error) throw error;
    markEmailSent();
    showVerification(email);
    startResendCooldown();
  }

  async function markVerifiedFromCurrentSession() {
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData?.session) return false;
    const { data, error } = await db.rpc("toolhub_mark_email_verified");
    if (error || !data) return false;
    clearPendingEmail();
    return true;
  }

  async function verifyCode(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = loadPendingEmail();
    const code = $("#profileOtpCode")?.value.replace(/\D/g, "") || "";
    const button = $("#profileOtpVerify");
    if (!email) return setMessage("No encontramos el correo pendiente. Vuelve a crear la cuenta.", "error");
    if (code.length < OTP_MIN_LENGTH || code.length > OTP_MAX_LENGTH) return setMessage("Introduce el código completo que aparece en el correo.", "error");

    if (button) button.disabled = true;
    setMessage("Verificando código…");

    const { error } = await db.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      if (button) button.disabled = false;
      return setMessage("El código no es válido o ha caducado. Puedes solicitar uno nuevo.", "error");
    }

    const { error: markError } = await db.rpc("toolhub_mark_email_verified");
    if (markError) {
      if (button) button.disabled = false;
      return setMessage("El correo se verificó, pero ToolHub no pudo activar el perfil. Inténtalo de nuevo.", "error");
    }

    clearPendingEmail();
    setMessage("✓ Correo verificado. Activando tu perfil…", "ok");
    setTimeout(() => location.reload(), 500);
  }

  async function resendCode() {
    const email = loadPendingEmail();
    if (!email) return setMessage("No encontramos un correo pendiente.", "error");

    const button = $("#profileOtpResend");
    if (button) button.disabled = true;
    setMessage("Enviando un código nuevo…");

    try {
      await resendSignupCode(email);
      setMessage("Código reenviado. Revisa tu correo.", "ok");
    } catch (error) {
      const wait = Number(String(error?.message || "").match(/after\s+(\d+)\s+seconds?/i)?.[1] || 0);
      if (wait) startResendCooldown(wait);
      else if (button) button.disabled = false;
      setMessage(friendlyAuthError(error, "No se pudo reenviar el código."), "error");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const usernameInput = $("#registerUsername");
    const displayInput = $("#registerDisplayName");
    const emailInput = $("#registerEmail");
    const passwordInput = $("#registerPassword");
    const submit = $("#profileRegisterForm button[type=submit]");

    const username = usernameInput?.value.trim() || "";
    const displayName = displayInput?.value.trim() || "";
    const email = emailInput?.value.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";

    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) return setMessage("El usuario debe tener entre 3 y 32 caracteres válidos.", "error");
    if (!email) return setMessage("Introduce un correo válido.", "error");
    if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.", "error");

    if (submit) submit.disabled = true;
    setMessage("Creando cuenta segura…");

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName, name: displayName } }
    });

    if (error) {
      if (submit) submit.disabled = false;
      return setMessage(friendlyAuthError(error, "No se pudo crear la cuenta."), "error");
    }

    // signUp ya envía el correo de confirmación. No solicitamos un segundo OTP aquí:
    // hacerlo inmediatamente provoca el límite de seguridad 429 de Supabase.
    if (data?.session) await db.auth.signOut();

    savePendingEmail(email);
    markEmailSent();
    showVerification(email);
    startResendCooldown();
    setMessage("Cuenta creada. Te hemos enviado un código para verificar tu correo.", "ok");

    if (submit) submit.disabled = false;
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

    if (error || !data?.user) {
      if (/confirm|verified|verification/i.test(error?.message || "")) {
        savePendingEmail(email);
        showVerification(email);
        try {
          await resendSignupCode(email);
          setMessage("Tu cuenta necesita verificar el correo. Te enviamos un código nuevo.", "ok");
        } catch (resendError) {
          const wait = Number(String(resendError?.message || "").match(/after\s+(\d+)\s+seconds?/i)?.[1] || 0);
          if (wait) startResendCooldown(wait);
          setMessage(friendlyAuthError(resendError, "Tu correo todavía no está verificado."), wait ? "error" : "error");
        }
        if (submit) submit.disabled = false;
        return;
      }

      if (submit) submit.disabled = false;
      return setMessage(friendlyAuthError(error, "No se pudo iniciar sesión."), "error");
    }

    const { data: profile, error: profileError } = await db
      .from("toolhub_profiles")
      .select("email_verified_at")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileError || !profile?.email_verified_at) {
      await db.auth.signOut();
      savePendingEmail(email);
      showVerification(email);
      try {
        await resendSignupCode(email);
        setMessage("Antes de entrar debes verificar que este correo es tuyo. Te enviamos un código nuevo.", "ok");
      } catch (resendError) {
        const wait = Number(String(resendError?.message || "").match(/after\s+(\d+)\s+seconds?/i)?.[1] || 0);
        if (wait) startResendCooldown(wait);
        setMessage(friendlyAuthError(resendError, "No se pudo enviar el código de verificación."), "error");
      }
      if (submit) submit.disabled = false;
      return;
    }

    setMessage("Sesión iniciada.", "ok");
    location.reload();
  }

  function prepareFields() {
    injectStyles();
    ensureVerifyForm();

    const username = $("#registerUsername");
    const displayName = $("#registerDisplayName");
    const password = $("#registerPassword");
    if (username) username.placeholder = "Example";
    if (displayName) displayName.placeholder = "Example";
    if (password) {
      password.minLength = 8;
      password.placeholder = "Mínimo 8 caracteres";
    }

    $("#profileRegisterForm")?.addEventListener("submit", handleRegister, true);
    $("#profileLoginForm")?.addEventListener("submit", handleLogin, true);
  }

  async function init() {
    prepareFields();

    // Compatibilidad con sesiones verificadas mediante un enlace antiguo.
    try {
      if (await markVerifiedFromCurrentSession()) {
        setMessage("✓ Correo verificado. Perfil activado.", "ok");
        return;
      }
    } catch {}

    const email = loadPendingEmail();
    if (email) {
      showVerification(email);
      const cooldown = remainingCooldown();
      if (cooldown) startResendCooldown(cooldown);
    }
  }

  init();
})();
