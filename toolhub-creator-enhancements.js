(() => {
  "use strict";

  if (window.__TOOLHUB_CREATOR_ENHANCEMENTS__) return;
  window.__TOOLHUB_CREATOR_ENHANCEMENTS__ = true;

  const path = location.pathname.toLowerCase();
  const isMatcap = path.endsWith("/matcap.html") || path.endsWith("matcap.html");
  const isShader = path.endsWith("/shader-generator.html") || path.endsWith("shader-generator.html");
  if (!isMatcap && !isShader) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const root = isMatcap ? $(".matcap-layout") : $(".shader-studio-grid");
  if (!root) return;

  function injectStyles() {
    if ($("#toolhubCreatorV2Styles")) return;
    const style = document.createElement("style");
    style.id = "toolhubCreatorV2Styles";
    style.textContent = `
      .creator-v2-block{margin-top:15px;padding:14px;border:1px solid rgba(122,91,255,.18);border-radius:14px;background:linear-gradient(145deg,rgba(102,65,255,.06),transparent),var(--bg-soft)}
      .creator-v2-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.creator-v2-head strong{font-size:.78rem;letter-spacing:.04em}.creator-v2-head span{color:var(--muted);font-size:.68rem}
      .creator-type-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.creator-type-button{min-height:38px;padding:6px 8px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);cursor:pointer;font-size:.7rem;font-weight:800;line-height:1.2;transition:.16s ease}.creator-type-button:hover{transform:translateY(-1px);border-color:rgba(137,105,255,.46);background:rgba(108,71,255,.08)}.creator-type-button.active{border-color:rgba(151,119,255,.6);color:#c9bcff;background:rgba(108,71,255,.14);box-shadow:inset 0 0 0 1px rgba(125,89,255,.08)}
      .creator-macro-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:11px}.creator-macro{display:grid;gap:5px;color:var(--muted);font-size:.68rem;font-weight:800}.creator-macro-row{display:grid;grid-template-columns:1fr 36px;gap:7px;align-items:center}.creator-macro input{width:100%}.creator-macro output{text-align:right;color:#b5a3ff;font-variant-numeric:tabular-nums}
      .creator-v2-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.creator-v2-action{min-height:37px;padding:0 9px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--text);cursor:pointer;font-size:.68rem;font-weight:800}.creator-v2-action.cloud{border-color:rgba(110,86,255,.35);color:#b9a8ff}.creator-v2-action:hover{border-color:rgba(132,101,255,.46)}
      .creator-save-backdrop{position:fixed;inset:0;z-index:15000;display:grid;place-items:center;padding:18px;background:rgba(3,4,9,.75);backdrop-filter:blur(10px)}.creator-save-backdrop[hidden]{display:none}.creator-save-card{width:min(430px,100%);padding:23px;border:1px solid rgba(130,96,255,.28);border-radius:18px;background:var(--panel-strong);box-shadow:0 28px 90px rgba(0,0,0,.45)}.creator-save-card h2{margin:5px 0 16px;font-size:1.45rem}.creator-save-card label{display:grid;gap:7px;margin-top:11px;color:var(--muted);font-size:.76rem;font-weight:800}.creator-save-card input,.creator-save-card select{width:100%;height:43px;padding:0 11px;border:1px solid var(--border);border-radius:10px;background:var(--bg-soft);color:var(--text)}.creator-save-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}.creator-save-message{min-height:18px;margin-top:10px;color:var(--muted);font-size:.72rem}.creator-save-message.error{color:#ff7c89}.creator-save-message.ok{color:#70ddb1}
      @media(max-width:720px){.creator-type-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.creator-v2-actions{grid-template-columns:1fr}.creator-macro-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function field(id) { return document.getElementById(id); }
  function setField(id, value) {
    const el = field(id); if (!el || value === undefined || value === null) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applySettings(settings) {
    Object.entries(settings || {}).forEach(([id, value]) => setField(id, value));
  }

  function collectSettings() {
    const scope = isMatcap ? $(".matcap-layout") : $(".shader-studio-grid");
    const settings = {};
    $$("input[id],select[id],textarea[id]", scope).forEach((el) => {
      if (!el.id || ["file", "password"].includes(el.type)) return;
      if (el.id.startsWith("creatorV2")) return;
      settings[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return settings;
  }

  function setStatus(text) {
    const el = isMatcap ? field("matcapStatus") : field("shaderStatus");
    if (el) el.textContent = text;
  }

  function randomHex() {
    return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
  }

  const MATCAP_TYPES = {
    standard: { label:"◯ Standard", settings:{ primaryColor:"#6f35ff",secondaryColor:"#2434aa",highlightColor:"#ffffff",shadowColor:"#05060b",rimColor:"#8e68ff",accentColor:"#4e9dff",metallic:25,roughness:32,specular:105,shininess:80,rim:32,rimPower:240,noise:4,distortion:0,iridescence:0,chromatic:0,scratches:0,spots:0 }},
    chrome: { label:"🪞 Chrome", settings:{ primaryColor:"#aeb8c6",secondaryColor:"#232b38",highlightColor:"#ffffff",shadowColor:"#000103",rimColor:"#dbeafe",accentColor:"#8795a9",metallic:100,roughness:2,specular:235,shininess:220,rim:30,rimPower:330,contrast:160,saturation:55,noise:2,distortion:0,scratches:3,iridescence:0 }},
    brushed: { label:"▥ Cepillado", settings:{ primaryColor:"#6f7782",secondaryColor:"#20242b",highlightColor:"#e9edf2",shadowColor:"#050607",rimColor:"#a9b1bd",metallic:96,roughness:43,specular:135,shininess:72,rim:24,bands:38,bandAngle:88,scratches:62,noise:12,noiseScale:240,contrast:135,saturation:50 }},
    velvet: { label:"✦ Terciopelo", settings:{ primaryColor:"#4d061b",secondaryColor:"#18020a",highlightColor:"#b95076",shadowColor:"#020103",rimColor:"#f07ca4",accentColor:"#7e173b",metallic:3,roughness:82,specular:32,shininess:22,rim:118,rimPower:455,fresnelTint:82,noise:8,contrast:135,saturation:140 }},
    crystal: { label:"◇ Cristal", settings:{ primaryColor:"#7acbff",secondaryColor:"#5f62ff",highlightColor:"#ffffff",shadowColor:"#071426",rimColor:"#bff3ff",accentColor:"#b47cff",metallic:16,roughness:4,specular:225,shininess:230,rim:125,rimPower:360,fresnelTint:98,iridescence:28,iridescenceScale:330,chromatic:12,contrast:125,saturation:120 }},
    plasma: { label:"⚡ Plasma", settings:{ primaryColor:"#5b16ff",secondaryColor:"#00b8ff",highlightColor:"#ffffff",shadowColor:"#04000c",rimColor:"#ff39d1",accentColor:"#21e6ff",metallic:35,roughness:15,specular:180,shininess:145,rim:105,rimPower:270,distortion:78,swirl:65,noise:32,iridescence:90,iridescenceScale:420,chromatic:28,saturation:185,contrast:150 }},
    nebula: { label:"☄ Nebulosa", settings:{ primaryColor:"#35116e",secondaryColor:"#0d4f9b",highlightColor:"#f3c7ff",shadowColor:"#02030a",rimColor:"#a23cff",accentColor:"#ef4b9b",metallic:20,roughness:35,specular:110,rim:75,distortion:55,swirl:95,noise:70,noiseScale:105,spots:35,iridescence:42,saturation:175,contrast:145 }},
    void: { label:"◼ Void", settings:{ primaryColor:"#08080d",secondaryColor:"#17102c",highlightColor:"#5f4a8c",shadowColor:"#000000",rimColor:"#7b35ff",accentColor:"#26104f",metallic:83,roughness:24,specular:95,shininess:115,rim:108,rimPower:300,fresnelTint:90,noise:19,distortion:18,iridescence:14,contrast:175,saturation:125,exposure:-18 }},
    candy: { label:"🍬 Candy", settings:{ primaryColor:"#ff3f9f",secondaryColor:"#6750ff",highlightColor:"#ffffff",shadowColor:"#21051a",rimColor:"#ffb4df",accentColor:"#63e7ff",metallic:18,roughness:5,specular:215,shininess:200,rim:64,rimPower:310,iridescence:22,saturation:205,contrast:128 }},
    ceramic: { label:"◉ Cerámica", settings:{ primaryColor:"#e8e5df",secondaryColor:"#b7b1aa",highlightColor:"#ffffff",shadowColor:"#252321",rimColor:"#f4eee8",accentColor:"#a79f96",metallic:2,roughness:17,specular:150,shininess:145,rim:28,rimPower:300,noise:3,saturation:40,contrast:112 }},
    obsidian: { label:"🌑 Obsidiana", settings:{ primaryColor:"#100b18",secondaryColor:"#2c0b16",highlightColor:"#ff5b6f",shadowColor:"#000000",rimColor:"#8a203b",accentColor:"#4f1123",metallic:72,roughness:8,specular:190,shininess:185,rim:58,rimPower:355,noise:20,distortion:20,scratches:22,contrast:185,saturation:105 }},
    pearl: { label:"🫧 Perla Pro", settings:{ primaryColor:"#f0e8f4",secondaryColor:"#8cbce8",highlightColor:"#ffffff",shadowColor:"#42384d",rimColor:"#ffb7e9",accentColor:"#8ce8df",metallic:12,roughness:9,specular:185,shininess:165,rim:72,rimPower:340,iridescence:65,iridescenceScale:230,chromatic:8,saturation:115,contrast:108 }}
  };

  const SHADER_TYPES = {
    pbr: { label:"◯ PBR", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#6f35ff",metallic:25,smoothness:68,opacity:100,enableEmission:false,enableRim:true,rimColor:"#b663ff",rimPower:280,rimIntensity:75,enableMatcap:false,enableDissolve:false,enableHue:false,enableUvScroll:false,enableUvRotate:false,enablePulse:false,enableWave:false,animateHue:false }},
    toon: { label:"✎ Toon", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#7040ff",metallic:0,smoothness:30,enableEmission:false,enableRim:true,rimColor:"#bca8ff",rimPower:520,rimIntensity:48,enableMatcap:false,enableDissolve:false,enableHue:false }},
    hologram: { label:"▦ Holograma", settings:{ shaderType:"unlit",renderMode:"transparent",baseColor:"#21cfff",opacity:58,metallic:0,smoothness:75,enableEmission:true,emissionColor:"#20d7ff",emissionIntensity:220,enableRim:true,rimColor:"#8deaff",rimPower:220,rimIntensity:145,enableHue:true,animateHue:true,hueSpeed:24,enableUvScroll:true,scrollY:42,enablePulse:true,pulseSpeed:260,pulseStrength:32 }},
    glass: { label:"◇ Glass", settings:{ shaderType:"lit",renderMode:"transparent",baseColor:"#8bd8ff",opacity:30,metallic:5,smoothness:96,enableEmission:false,enableRim:true,rimColor:"#d3f5ff",rimPower:420,rimIntensity:90,enableMatcap:false,enableDissolve:false,enableHue:false }},
    iridescent: { label:"🌈 Iridiscente", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#7748ff",metallic:58,smoothness:88,enableEmission:true,emissionColor:"#2b7dff",emissionIntensity:38,enableRim:true,rimColor:"#ff53d8",rimPower:260,rimIntensity:90,enableHue:true,animateHue:true,hueSpeed:18 }},
    energy: { label:"⚡ Energía", settings:{ shaderType:"unlit",renderMode:"transparent",baseColor:"#3310c8",opacity:78,enableEmission:true,emissionColor:"#5c3cff",emissionIntensity:350,enableRim:true,rimColor:"#42d8ff",rimPower:190,rimIntensity:180,enablePulse:true,pulseSpeed:300,pulseStrength:75,enableWave:true,waveAmp:8,waveFreq:420,waveSpeed:220,enableHue:true,animateHue:true,hueSpeed:15 }},
    metal: { label:"⚙ Metal", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#69717d",metallic:100,smoothness:93,enableEmission:false,enableRim:true,rimColor:"#d8e1ed",rimPower:390,rimIntensity:42,enableMatcap:true,matcapStrength:38,enableDissolve:false,enableHue:false }},
    ice: { label:"❄ Hielo", settings:{ shaderType:"lit",renderMode:"transparent",baseColor:"#82d9ff",opacity:78,metallic:12,smoothness:92,enableEmission:true,emissionColor:"#70cfff",emissionIntensity:28,enableRim:true,rimColor:"#d7f8ff",rimPower:330,rimIntensity:115,enableHue:false }},
    corrosive: { label:"☣ Corrosivo", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#381047",metallic:68,smoothness:65,enableEmission:true,emissionColor:"#69ff39",emissionIntensity:72,enableRim:true,rimColor:"#a8ff4f",rimPower:250,rimIntensity:82,enableDissolve:true,dissolve:18,dissolveEdge:10,enableHue:true,hue:300,enablePulse:true,pulseSpeed:145,pulseStrength:18 }},
    pearl: { label:"🫧 Perla", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#eadff3",metallic:20,smoothness:94,enableEmission:false,enableRim:true,rimColor:"#ffb9ea",rimPower:310,rimIntensity:75,enableHue:true,hue:15,animateHue:true,hueSpeed:6 }},
    void: { label:"◼ Void", settings:{ shaderType:"lit",renderMode:"opaque",baseColor:"#07070c",metallic:84,smoothness:66,enableEmission:true,emissionColor:"#4915aa",emissionIntensity:42,enableRim:true,rimColor:"#7f37ff",rimPower:240,rimIntensity:125,enableHue:false,enablePulse:true,pulseSpeed:110,pulseStrength:12 }}
  };

  function typeGrid(types, dataAttr) {
    return Object.entries(types).map(([key, item]) => `<button class="creator-type-button" type="button" ${dataAttr}="${key}">${item.label}</button>`).join("");
  }

  function buildMatcap() {
    const canvasWrap = $(".matcap-canvas-wrap"); if (!canvasWrap) return;
    const block = document.createElement("div"); block.className = "creator-v2-block";
    block.innerHTML = `<div class="creator-v2-head"><strong>TIPO DE MATCAP</strong><span>11 acabados nuevos</span></div><div class="creator-type-grid">${typeGrid(MATCAP_TYPES,"data-matcap-v2")}</div><div class="creator-macro-grid">
      <label class="creator-macro">Clear Coat<div class="creator-macro-row"><input id="creatorV2Coat" type="range" min="0" max="100" value="55"><output>55</output></div></label>
      <label class="creator-macro">Borde / Fresnel<div class="creator-macro-row"><input id="creatorV2Edge" type="range" min="0" max="100" value="35"><output>35</output></div></label>
      <label class="creator-macro">Microdetalle<div class="creator-macro-row"><input id="creatorV2Detail" type="range" min="0" max="100" value="15"><output>15</output></div></label>
      <label class="creator-macro">Óptica<div class="creator-macro-row"><input id="creatorV2Optics" type="range" min="0" max="100" value="0"><output>0</output></div></label>
    </div><div class="creator-v2-actions"><button class="creator-v2-action cloud" type="button" data-cloud-save>☁ Guardar en perfil</button><button class="creator-v2-action" type="button" data-export-v2>⇩ Config rápida</button><button class="creator-v2-action" type="button" data-import-v2>⇧ Cargar rápida</button><input type="file" data-import-file accept="application/json,.json" hidden></div>`;
    canvasWrap.insertAdjacentElement("afterend", block);

    $$('[data-matcap-v2]', block).forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.matcapV2; applySettings(MATCAP_TYPES[key].settings);
      $$('[data-matcap-v2]', block).forEach((b) => b.classList.toggle("active", b === button));
      setStatus(`Tipo ${MATCAP_TYPES[key].label.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ ]/g, "").trim()} aplicado. Puedes seguir ajustando todos los controles profesionales.`);
    }));

    const macroMap = {
      creatorV2Coat: (v) => applySettings({ specular: Math.round(60 + v * 1.85), shininess: Math.round(35 + v * 2), roughness: Math.round(62 - v * .58) }),
      creatorV2Edge: (v) => applySettings({ rim: Math.round(v * 1.45), fresnelTint: Math.round(v * 1.25), rimPower: Math.round(520 - v * 2.8) }),
      creatorV2Detail: (v) => applySettings({ noise: Math.round(v * .65), scratches: Math.round(v * .7), spots: Math.round(v * .25) }),
      creatorV2Optics: (v) => applySettings({ iridescence: Math.round(v * 1.25), chromatic: Math.round(v * .45), iridescenceScale: Math.round(180 + v * 3.2) })
    };
    Object.entries(macroMap).forEach(([id, fn]) => { const input = field(id); const output = input.nextElementSibling; input.addEventListener("input", () => { output.value = input.value; output.textContent = input.value; fn(Number(input.value)); }); });
    wireCommonActions(block, "matcap");
  }

  function buildShader() {
    const wrap = $(".shader-preview-wrap"); if (!wrap) return;
    const block = document.createElement("div"); block.className = "creator-v2-block";
    block.innerHTML = `<div class="creator-v2-head"><strong>TIPOS Y PRESETS RÁPIDOS</strong><span>configuración debajo del preview</span></div><div class="creator-type-grid">${typeGrid(SHADER_TYPES,"data-shader-v2")}</div><div class="creator-macro-grid">
      <label class="creator-macro">Brillo / acabado<div class="creator-macro-row"><input id="creatorV2Gloss" type="range" min="0" max="100" value="65"><output>65</output></div></label>
      <label class="creator-macro">Rim / Fresnel<div class="creator-macro-row"><input id="creatorV2ShaderEdge" type="range" min="0" max="100" value="50"><output>50</output></div></label>
      <label class="creator-macro">Movimiento<div class="creator-macro-row"><input id="creatorV2Motion" type="range" min="0" max="100" value="0"><output>0</output></div></label>
      <label class="creator-macro">Transparencia<div class="creator-macro-row"><input id="creatorV2Alpha" type="range" min="0" max="100" value="100"><output>100</output></div></label>
    </div><div class="creator-v2-actions"><button class="creator-v2-action" type="button" data-random-v2>🎲 Aleatorio</button><button class="creator-v2-action" type="button" data-local-save>💾 Guardar local</button><button class="creator-v2-action" type="button" data-local-load>📂 Recuperar</button><button class="creator-v2-action cloud" type="button" data-cloud-save>☁ Guardar en perfil</button><button class="creator-v2-action" type="button" data-export-v2>⇩ JSON</button><button class="creator-v2-action" type="button" data-import-v2>⇧ Cargar JSON</button><input type="file" data-import-file accept="application/json,.json" hidden></div>`;
    wrap.insertAdjacentElement("afterend", block);

    $$('[data-shader-v2]', block).forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.shaderV2; applySettings(SHADER_TYPES[key].settings);
      $$('[data-shader-v2]', block).forEach((b) => b.classList.toggle("active", b === button));
      setStatus(`Preset ${SHADER_TYPES[key].label.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ ]/g, "").trim()} aplicado. Todos los parámetros siguen siendo editables.`);
    }));

    const macros = {
      creatorV2Gloss: (v) => applySettings({ smoothness: v, metallic: Math.round(Math.max(0, v - 35) * 1.15) }),
      creatorV2ShaderEdge: (v) => applySettings({ enableRim: v > 0, rimIntensity: Math.round(v * 1.7), rimPower: Math.round(560 - v * 3.2) }),
      creatorV2Motion: (v) => applySettings({ enableUvScroll: v > 12, scrollX: Math.round(v * .65), enablePulse: v > 35, pulseSpeed: Math.round(80 + v * 3), pulseStrength: Math.round(v * .55), enableWave: v > 70, waveAmp: Math.round((v - 60) * .35) }),
      creatorV2Alpha: (v) => applySettings({ opacity: v, renderMode: v < 100 ? "transparent" : "opaque" })
    };
    Object.entries(macros).forEach(([id, fn]) => { const input = field(id); const output = input.nextElementSibling; input.addEventListener("input", () => { output.value = input.value; output.textContent = input.value; fn(Number(input.value)); }); });
    block.querySelector('[data-random-v2]').addEventListener("click", () => {
      const keys = Object.keys(SHADER_TYPES); const preset = SHADER_TYPES[keys[Math.floor(Math.random() * keys.length)]];
      applySettings({ ...preset.settings, baseColor: randomHex(), rimColor: randomHex(), emissionColor: randomHex(), hue: Math.floor(Math.random() * 360), smoothness: 25 + Math.floor(Math.random() * 75), metallic: Math.floor(Math.random() * 100) });
      setStatus("Shader aleatorio generado. Ajusta los controles para afinarlo.");
    });
    wireCommonActions(block, "shader");
  }

  function wireCommonActions(block, type) {
    const storageKey = `toolhub_creator_local_${type}_v2`;
    block.querySelector('[data-local-save]')?.addEventListener("click", () => { try { localStorage.setItem(storageKey, JSON.stringify(collectSettings())); setStatus("Configuración guardada localmente."); } catch { setStatus("No se pudo guardar localmente."); } });
    block.querySelector('[data-local-load]')?.addEventListener("click", () => { try { const raw = localStorage.getItem(storageKey); if (!raw) return setStatus("No hay una configuración local guardada."); applySettings(JSON.parse(raw)); setStatus("Configuración local recuperada."); } catch { setStatus("La configuración local no es válida."); } });
    block.querySelector('[data-cloud-save]')?.addEventListener("click", () => openSaveModal(type));
    block.querySelector('[data-export-v2]')?.addEventListener("click", () => exportJson(type));
    const fileInput = block.querySelector('[data-import-file]');
    block.querySelector('[data-import-v2]')?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", async () => { const file = fileInput.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); applySettings(parsed.settings || parsed); setStatus("Configuración cargada correctamente."); } catch { setStatus("El JSON seleccionado no es válido."); } fileInput.value = ""; });
  }

  function exportJson(type) {
    const data = { toolhub: 2, type, exported_at: new Date().toISOString(), settings: collectSettings() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `toolhub-${type}-config.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
    setStatus("Configuración JSON exportada.");
  }

  function ensureSaveModal() {
    let backdrop = $("#creatorSaveBackdrop"); if (backdrop) return backdrop;
    backdrop = document.createElement("div"); backdrop.id = "creatorSaveBackdrop"; backdrop.className = "creator-save-backdrop"; backdrop.hidden = true;
    backdrop.innerHTML = `<section class="creator-save-card" role="dialog" aria-modal="true"><span class="eyebrow purple">TOOLHUB · PERFIL</span><h2>Guardar creación</h2><label>Nombre<input id="creatorSaveName" type="text" maxlength="100" placeholder="Mi configuración"></label><label>Visibilidad<select id="creatorSaveVisibility"><option value="private">Privada</option><option value="public">Pública</option></select></label><div class="creator-save-message" id="creatorSaveMessage"></div><div class="creator-save-actions"><button class="button secondary" id="creatorSaveCancel" type="button">Cancelar</button><button class="button primary" id="creatorSaveConfirm" type="button">Guardar</button></div></section>`;
    document.body.appendChild(backdrop);
    field("creatorSaveCancel").addEventListener("click", () => { backdrop.hidden = true; });
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.hidden = true; });
    return backdrop;
  }

  async function openSaveModal(type) {
    if (!window.ToolHubAccount) { setStatus("El sistema de perfiles todavía está cargando. Inténtalo de nuevo en un instante."); return; }
    const user = await window.ToolHubAccount.getUser();
    if (!user) {
      const url = new URL(window.ToolHubAccount.profileUrl); url.searchParams.set("next", location.href); location.href = url.href; return;
    }
    const backdrop = ensureSaveModal(); backdrop.dataset.type = type; backdrop.hidden = false;
    field("creatorSaveName").value = type === "matcap" ? "Mi MatCap" : "Mi Shader";
    field("creatorSaveVisibility").value = "private"; field("creatorSaveMessage").textContent = "";
    field("creatorSaveName").focus();
    field("creatorSaveConfirm").onclick = async () => {
      const name = field("creatorSaveName").value.trim(); if (!name) return;
      const db = await window.ToolHubAccount.getClient(); const button = field("creatorSaveConfirm"); button.disabled = true; field("creatorSaveMessage").textContent = "Guardando…";
      const { error } = await db.from("toolhub_creations").insert({ user_id: user.id, creation_type: type, name, visibility: field("creatorSaveVisibility").value, settings: collectSettings() });
      button.disabled = false;
      if (error) { field("creatorSaveMessage").textContent = error.message; field("creatorSaveMessage").className = "creator-save-message error"; return; }
      field("creatorSaveMessage").textContent = "Guardado en tu perfil."; field("creatorSaveMessage").className = "creator-save-message ok"; setStatus(`${name} guardado en tu perfil.`); setTimeout(() => backdrop.hidden = true, 800);
    };
  }

  function loadProfileImport(type) {
    const params = new URLSearchParams(location.search); if (params.get("loadProfileCreation") !== "1") return;
    try {
      const key = `toolhub_creator_import_${type}`; const raw = localStorage.getItem(key); if (!raw) return;
      setTimeout(() => { applySettings(JSON.parse(raw)); localStorage.removeItem(key); setStatus("Creación de tu perfil cargada. Puedes seguir editándola."); }, 120);
    } catch (_) {}
  }

  injectStyles();
  if (isMatcap) { buildMatcap(); loadProfileImport("matcap"); }
  if (isShader) { buildShader(); loadProfileImport("shader"); }
})();