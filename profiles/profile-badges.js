(() => {
  "use strict";

  if (window.__TOOLHUB_PROFILE_BADGES__) return;
  window.__TOOLHUB_PROFILE_BADGES__ = true;

  const cfg = window.TOOLHUB_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) return;

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "toolhub-community-auth-v2",
    },
  });

  const style = document.createElement("style");
  style.id = "toolhubProfileBadgeStyles";
  style.textContent = `
    .toolhub-profile-badges{
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      gap:7px;
      margin-top:9px;
    }
    .toolhub-profile-badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:25px;
      padding:3px 10px;
      border:1px solid currentColor;
      border-radius:999px;
      font-size:.68rem;
      line-height:1;
      font-weight:900;
      letter-spacing:.045em;
      text-transform:none;
      box-shadow:0 0 16px var(--toolhub-badge-glow, transparent);
    }
  `;
  document.head.appendChild(style);

  function rgba(hex, alpha) {
    const value = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(139,92,246,${alpha})`;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function ensureContainer() {
    const handle = document.getElementById("profileHandle");
    if (!handle) return null;
    let box = document.getElementById("toolhubProfileBadges");
    if (!box) {
      box = document.createElement("div");
      box.id = "toolhubProfileBadges";
      box.className = "toolhub-profile-badges";
      box.setAttribute("aria-label", "Insignias del perfil");
      handle.insertAdjacentElement("afterend", box);
    }
    return box;
  }

  async function render() {
    const box = ensureContainer();
    if (!box) return;

    const { data: sessionData } = await db.auth.getSession();
    const user = sessionData.session?.user || null;
    if (!user) {
      box.replaceChildren();
      box.hidden = true;
      return;
    }

    const { data, error } = await db
      .from("toolhub_profile_badges")
      .select("badge_key,label,color,sort_order")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("ToolHub profile badges:", error);
      box.replaceChildren();
      box.hidden = true;
      return;
    }

    box.replaceChildren();
    (data || []).forEach((badge) => {
      const color = /^#[0-9a-f]{6}$/i.test(String(badge.color || "")) ? badge.color : "#8B5CF6";
      const el = document.createElement("span");
      el.className = "toolhub-profile-badge";
      el.dataset.badgeKey = badge.badge_key;
      el.textContent = badge.label;
      el.style.color = color;
      el.style.background = rgba(color, 0.14);
      el.style.setProperty("--toolhub-badge-glow", rgba(color, 0.22));
      box.appendChild(el);
    });
    box.hidden = !box.childElementCount;
  }

  render().catch((error) => console.error("ToolHub profile badges:", error));
  db.auth.onAuthStateChange(() => setTimeout(() => render().catch(() => {}), 0));
})();
