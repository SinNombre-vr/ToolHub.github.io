(() => {
  "use strict";

  if (window.__TOOLHUB_PRIVATE_SESSION_UI__) return;
  window.__TOOLHUB_PRIVATE_SESSION_UI__ = true;

  const gate = document.getElementById("privateAccessGate");
  const fields = document.getElementById("privateLoginFields");
  const message = document.getElementById("privateGateMessage");
  if (!gate || !fields) return;

  function profileHref() {
    const url = new URL("profile.html", location.href);
    url.searchParams.set("next", location.href);
    return url.href;
  }

  function ensureActions() {
    if (!fields.hidden) fields.hidden = true;

    let actions = document.getElementById("privateAuth2Actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.id = "privateAuth2Actions";
      actions.className = "private-access-actions";

      const login = document.createElement("a");
      login.className = "private-primary";
      login.href = profileHref();
      login.textContent = "Iniciar sesión en ToolHub";

      const back = document.createElement("a");
      back.className = "private-secondary";
      back.href = "index.html#asset-library";
      back.textContent = "Volver";

      actions.append(login, back);
      fields.insertAdjacentElement("afterend", actions);
    }

    if (!gate.hidden && message && /captcha protection|captcha_token/i.test(message.textContent || "")) {
      message.textContent = "";
    }
  }

  ensureActions();

  const observer = new MutationObserver(ensureActions);
  observer.observe(gate, { subtree: true, childList: true, attributes: true, characterData: true });
})();
