(() => {
  "use strict";

  const config = window.TOOLHUB_SUPABASE || {};
  const supabaseApi = window.supabase;
  const MANAGER_ROLES = new Set(["owner", "admin"]);
  const FIELDS = "id,name,category,author,platform,author_url,preview_url,download_url,tags,description,created_at,updated_at";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const els = {
    gate: $("#privateAccessGate"), gateTitle: $("#privateGateTitle"), gateText: $("#privateGateText"), gateMessage: $("#privateGateMessage"),
    loginFields: $("#privateLoginFields"), shell: $("#privateLibraryShell"), topbarStatus: $("#privateTopbarStatus"), topbarText: $("#privateTopbarText"),
    logoutButton: $("#privateLogoutButton"), navButtons: $$('[data-private-panel]'), panels: $$('[data-private-panel-name]'), form: $("#privateAssetForm"),
    publishButton: $("#privateAssetPublishButton"), search: $("#privateAssetSearch"), filterCategory: $("#privateFilterCategory"), filterPlatform: $("#privateFilterPlatform"),
    filterTags: $("#privateFilterTags"), clearFilters: $("#privateClearFilters"), grid: $("#privateAssetGrid"), empty: $("#privateAssetEmpty"), emptyTitle: $("#privateAssetEmptyTitle"),
    emptyText: $("#privateAssetEmptyText"), template: $("#privateAssetCardTemplate"), resultCount: $("#privateResultCount"), assetCount: $("#privateAssetCount"),
    tagCount: $("#privateTagCount"), categoryCount: $("#privateCategoryCount"), sync: $("#privateSyncStatus")
  };

  const state = { db:null, user:null, role:null, canManage:false, badge:null, assets:[], search:"", category:"", platform:"", tags:new Set() };

  function setGate(title, text, message = "") {
    els.gate.hidden = false; els.shell.hidden = true; els.gateTitle.textContent = title; els.gateText.textContent = text; els.gateMessage.textContent = message;
    if (els.loginFields) els.loginFields.hidden = true;
  }
  function setSync(text, mode="") { els.sync.textContent = text; els.sync.className = "private-sync" + (mode ? ` ${mode}` : ""); }
  function safeUrl(v){ try { const u=new URL(String(v||"").trim()); return ["http:","https:"].includes(u.protocol)?u.href:""; } catch { return ""; } }
  function normalizeTags(v){ const src=Array.isArray(v)?v.join(","):String(v||""); return [...new Set(src.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean))].slice(0,20); }
  function allTags(){ return [...new Set(state.assets.flatMap(a=>Array.isArray(a.tags)?a.tags:[]))].sort(); }
  function allCategories(){ return [...new Set(state.assets.map(a=>a.category).filter(Boolean))].sort(); }
  function roleLabel(){ if(state.role==="owner") return "Owner"; if(state.role==="admin") return "Admin"; return state.badge?.label || "Acceso privado"; }

  async function accessFor(user){
    const [roleRes, accessRes, badgeRes] = await Promise.all([
      state.db.from("toolhub_admins").select("role").eq("user_id",user.id).maybeSingle(),
      state.db.from("toolhub_private_access").select("access_level").eq("user_id",user.id).maybeSingle(),
      state.db.from("toolhub_profile_badges").select("label,color,sort_order").eq("user_id",user.id).eq("active",true).order("sort_order",{ascending:true}).limit(1).maybeSingle()
    ]);
    if(roleRes.error) throw roleRes.error;
    if(accessRes.error) throw accessRes.error;
    const role=roleRes.data?.role || null;
    const canManage=MANAGER_ROLES.has(role);
    const canView=canManage || accessRes.data?.access_level === "viewer";
    return { role, canManage, canView, badge: badgeRes.data || null };
  }

  function applyAccessUi(){
    const createButton = $('[data-private-panel="create"]');
    const createPanel = $('#private-panel-create');
    if (!state.canManage) {
      if(createButton) createButton.hidden = true;
      if(createPanel) createPanel.hidden = true;
      setPanel("search");
    }
  }

  function showAuthorized(user, access){
    state.user=user; state.role=access.role; state.canManage=access.canManage; state.badge=access.badge;
    els.gate.hidden=true; els.shell.hidden=false; els.topbarText.textContent=`${roleLabel()} · ${state.canManage ? "gestión privada" : "solo lectura"}`;
    els.topbarStatus.classList.add("unlocked"); applyAccessUi();
  }

  function setPanel(name){
    els.navButtons.forEach(b=>{ if(b.dataset.privatePanel) b.classList.toggle("active",b.dataset.privatePanel===name); });
    els.panels.forEach(p=>p.classList.toggle("active",p.dataset.privatePanelName===name));
  }

  function filteredAssets(){
    const q=state.search.trim().toLowerCase();
    return state.assets.filter(a=>{
      const hay=[a.name,a.author,a.category,a.platform,a.description,...(Array.isArray(a.tags)?a.tags:[])].join(" ").toLowerCase();
      if(q&&!hay.includes(q)) return false; if(state.category&&a.category!==state.category) return false; if(state.platform&&a.platform!==state.platform) return false;
      if(state.tags.size){ const t=new Set(Array.isArray(a.tags)?a.tags:[]); for(const x of state.tags) if(!t.has(x)) return false; }
      return true;
    }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  }

  function renderFilters(){
    const cur=state.category; els.filterCategory.innerHTML='<option value="">Todas</option>';
    allCategories().forEach(c=>{ const o=document.createElement("option"); o.value=c;o.textContent=c;els.filterCategory.appendChild(o); }); els.filterCategory.value=cur;
    els.filterTags.replaceChildren(); allTags().forEach(tag=>{ const b=document.createElement("button"); b.type="button";b.className="private-tag-button";b.textContent=`#${tag}`;b.classList.toggle("active",state.tags.has(tag));b.onclick=()=>{state.tags.has(tag)?state.tags.delete(tag):state.tags.add(tag);render();};els.filterTags.appendChild(b); });
  }

  async function deleteAsset(asset,card){ if(!state.canManage) return; if(!confirm(`¿Eliminar definitivamente "${asset.name}" del almacén privado?`)) return; card.style.opacity=".45"; const {error}=await state.db.from("toolhub_private_assets").delete().eq("id",asset.id); if(error){card.style.opacity="";alert(error.message);return;} state.assets=state.assets.filter(x=>x.id!==asset.id);render(); }

  function renderCards(){
    const assets=filteredAssets(); els.grid.replaceChildren(); els.resultCount.textContent=`${assets.length} ${assets.length===1?"resultado":"resultados"}`;
    if(!assets.length){els.empty.hidden=false;els.emptyTitle.textContent=state.assets.length?"No hay coincidencias":"El almacén privado está vacío";els.emptyText.textContent=state.assets.length?"Prueba otra búsqueda o restablece los filtros.":"No hay fichas privadas disponibles.";return;}
    els.empty.hidden=true;
    assets.forEach(asset=>{
      const node=els.template.content.cloneNode(true), card=$(".private-card",node), image=$(".private-preview",node), fallback=$(".private-preview-fallback",node);
      $(".private-platform",node).textContent=asset.platform||"No especificado"; $(".private-category",node).textContent=asset.category||"OTRO"; $(".private-title",node).textContent=asset.name||"Sin nombre";
      $(".private-author",node).textContent=asset.author?`por ${asset.author}`:"Autor no especificado"; $(".private-description",node).textContent=asset.description||"Sin notas.";
      const d=new Date(asset.created_at||""); $(".private-created",node).textContent=Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-ES");
      const au=safeUrl(asset.author_url),du=safeUrl(asset.download_url),al=$(".private-author-link",node),dl=$(".private-download-link",node); al.href=au||"#";dl.href=du||"#";al.hidden=!au;dl.hidden=!du;
      const p=safeUrl(asset.preview_url); fallback.hidden=false; if(p){image.src=p;image.alt=`Preview de ${asset.name||"asset privado"}`;image.onload=()=>{image.classList.add("visible");fallback.hidden=true;};image.onerror=()=>{image.classList.remove("visible");fallback.hidden=false;};}
      const tagBox=$(".private-card-tags",node); (Array.isArray(asset.tags)?asset.tags:[]).forEach(tag=>{const s=document.createElement("span");s.textContent=`#${tag}`;tagBox.appendChild(s);});
      const del=$(".private-delete",node); if(state.canManage) del.addEventListener("click",()=>deleteAsset(asset,card)); else del.hidden=true;
      els.grid.appendChild(node);
    });
  }

  function render(){ els.assetCount.textContent=String(state.assets.length);els.tagCount.textContent=String(allTags().length);els.categoryCount.textContent=String(allCategories().length);renderFilters();renderCards(); }

  async function loadAssets(){ setSync("Cargando almacén privado…"); const {data,error}=await state.db.from("toolhub_private_assets").select(FIELDS).order("created_at",{ascending:false}).limit(500); if(error){console.error(error);setSync(`Error: ${error.message}`,"error");els.empty.hidden=false;els.emptyTitle.textContent="No se pudo cargar";els.emptyText.textContent="Revisa la conexión y los permisos RLS.";return;} state.assets=Array.isArray(data)?data:[];render();setSync(`Privado · ${state.assets.length} ${state.assets.length===1?"asset":"assets"}`,"ok"); }

  function formPayload(){
    const name=$("#privateAssetName").value.trim(),category=$("#privateAssetCategory").value;if(!name)throw new Error("Introduce un nombre.");if(!category)throw new Error("Selecciona una categoría.");
    return {name,category,author:$("#privateAssetAuthor").value.trim(),platform:$("#privateAssetPlatform").value||"No especificado",author_url:safeUrl($("#privateAssetAuthorUrl").value),preview_url:safeUrl($("#privateAssetPreview").value),download_url:safeUrl($("#privateAssetDownloadUrl").value),tags:normalizeTags($("#privateAssetTags").value),description:$("#privateAssetDescription").value.trim()};
  }

  async function initialize(){
    if(!config.url||!config.publishableKey||!supabaseApi?.createClient){setGate("No se pudo iniciar","Falta la configuración de Supabase.");return;}
    state.db=supabaseApi.createClient(config.url,config.publishableKey);
    try{const {data,error}=await state.db.auth.getSession();if(error)throw error;const user=data.session?.user;if(!user){setGate("Almacén bloqueado","Inicia sesión en ToolHub para acceder.");return;}const access=await accessFor(user);if(!access.canView){setGate("Almacén bloqueado","Tu cuenta no tiene acceso al almacén privado.");return;}showAuthorized(user,access);await loadAssets();}catch(e){console.error(e);setGate("Almacén bloqueado","No se pudo verificar tu acceso.",e.message||"");}
  }

  els.navButtons.forEach(b=>{if(b.dataset.privatePanel)b.addEventListener("click",()=>setPanel(b.dataset.privatePanel));});
  els.search?.addEventListener("input",()=>{state.search=els.search.value;renderCards();}); els.filterCategory?.addEventListener("change",()=>{state.category=els.filterCategory.value;renderCards();}); els.filterPlatform?.addEventListener("change",()=>{state.platform=els.filterPlatform.value;renderCards();});
  els.clearFilters?.addEventListener("click",()=>{state.category="";state.platform="";state.tags.clear();els.filterCategory.value="";els.filterPlatform.value="";render();});
  els.form?.addEventListener("submit",async e=>{e.preventDefault();if(!state.canManage)return;let payload;try{payload=formPayload();}catch(err){setSync(err.message,"error");return;}els.publishButton.disabled=true;const {data,error}=await state.db.from("toolhub_private_assets").insert(payload).select(FIELDS).single();els.publishButton.disabled=false;if(error){setSync(`No se pudo guardar: ${error.message}`,"error");return;}state.assets.unshift(data);els.form.reset();render();setSync("✓ Ficha guardada en el almacén privado","ok");});
  els.logoutButton?.addEventListener("click",async()=>{await state.db?.auth.signOut();location.href="index.html#asset-library";});

  initialize();
})();
