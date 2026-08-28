(() => {
  "use strict";

  function nameFor(user, profile) {
    return profile?.display_name?.trim() || profile?.username?.trim() || user?.user_metadata?.display_name?.trim() || user?.user_metadata?.username?.trim() || user?.email?.split("@")[0] || "Perfil";
  }

  function apply(user, profile) {
    const link = document.getElementById("toolhubAccountLink");
    if (!link) return;
    const label = link.querySelector(".toolhub-account-label");
    if (!label) return;
    if (!user) {
      label.textContent = "Login / Register";
      return;
    }
    const name = nameFor(user, profile);
    label.textContent = name;
    link.title = `Abrir perfil de ${name}`;
  }

  document.addEventListener("toolhub-account-changed", (event) => {
    apply(event.detail?.user || null, event.detail?.profile || null);
  });

  async function sync() {
    if (!window.ToolHubAccount) return;
    await window.ToolHubAccount.ready();
    const [user, profile] = await Promise.all([
      window.ToolHubAccount.getUser(),
      window.ToolHubAccount.getProfile(),
    ]);
    apply(user, profile);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(sync, 0), { once:true });
  else setTimeout(sync, 0);
})();
