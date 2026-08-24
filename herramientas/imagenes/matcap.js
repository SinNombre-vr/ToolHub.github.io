(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("matcapCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const status = $("matcapStatus");
  const exportSize = $("exportSize");
  const downloadButton = $("downloadMatcap");
  const MEMORY_KEY = "toolhub_matcap_memory_v2";
  const LOCAL_PRESET_KEY = "toolhub_matcap_saved_preset_v1";

  const colorIds = ["primaryColor", "secondaryColor", "highlightColor", "shadowColor", "rimColor", "accentColor"];
  const numericDefs = {
    lightX: [-1, 1, 100, 2], lightY: [-1, 1, 100, 2], lightSize: [.05, 1, 100, 2], lightFalloff: [.2, 3, 100, 2],
    ambient: [0, 1.2, 100, 2], diffuse: [0, 2, 100, 2], specular: [0, 2.5, 100, 2], shininess: [4, 240, 1, 0],
    secondaryLight: [0, 1.5, 100, 2], secondaryLightOffset: [0, 1, 100, 2], rim: [0, 1.8, 100, 2], rimPower: [.2, 8, 100, 2],
    metallic: [0, 1, 100, 2], roughness: [0, 1, 100, 2], contrast: [.4, 2.8, 100, 2], saturation: [0, 2.8, 100, 2],
    exposure: [-1, 1.5, 100, 2], gamma: [.4, 2.2, 100, 2], gradientBias: [-1, 1, 100, 2], vignette: [0, 1, 100, 2],
    distortion: [0, 1.5, 100, 2], swirl: [-2, 2, 100, 2], noise: [0, 1.5, 100, 2], noiseScale: [.1, 5, 100, 2],
    rings: [0, 1.5, 100, 2], ringFrequency: [.1, 8, 100, 2], bands: [0, 1.5, 100, 2], bandAngle: [0, 360, 1, 0],
    scratches: [0, 1, 100, 2], spots: [0, 1, 100, 2], hueShift: [-180, 180, 1, 0], iridescence: [0, 1.5, 100, 2],
    iridescenceScale: [.1, 8, 100, 2], chromatic: [0, 1, 100, 2], posterize: [0, 12, 1, 0], fresnelTint: [0, 1.5, 100, 2],
    centerX: [-.5, .5, 100, 2], centerY: [-.5, .5, 100, 2], zoom: [.5, 1.8, 100, 2], rotation: [-180, 180, 1, 0],
    overlayOpacity: [0, 1, 100, 2], overlayScale: [.25, 5, 100, 2], overlayRotation: [-180, 180, 1, 0],
  };

  const controls = {};
  colorIds.forEach((id) => controls[id] = $(id));
  Object.keys(numericDefs).forEach((id) => controls[id] = $(id));
  controls.overlayBlend = $("overlayBlend");
  controls.outsideMode = $("outsideMode");
  controls.outsideColor = $("outsideColor");

  const defaults = {
    primaryColor: "#731526", secondaryColor: "#1F4CFF", highlightColor: "#F8FBFF", shadowColor: "#03050A", rimColor: "#8135FF", accentColor: "#FF244F",
    lightX: -.34, lightY: -.52, lightSize: .38, lightFalloff: 1.2, ambient: .18, diffuse: .92, specular: 1.15, shininess: 88,
    secondaryLight: .25, secondaryLightOffset: .38, rim: .38, rimPower: 2.2, metallic: .72, roughness: .28, contrast: 1.38, saturation: 1.28,
    exposure: 0, gamma: 1, gradientBias: 0, vignette: .10, distortion: .42, swirl: .18, noise: .17, noiseScale: 1.60,
    rings: 0, ringFrequency: 2.60, bands: 0, bandAngle: 45, scratches: 0, spots: 0, hueShift: 0, iridescence: 0, iridescenceScale: 2.8,
    chromatic: 0, posterize: 0, fresnelTint: .25, centerX: 0, centerY: 0, zoom: 1, rotation: 0,
    overlayOpacity: 0, overlayScale: 1, overlayRotation: 0, overlayBlend: "softlight", outsideMode: "transparent", outsideColor: "#000000",
  };

  const presets = {
    wineCorrosive: { ...defaults, primaryColor:"#711326",secondaryColor:"#1756FF",accentColor:"#FF2149",shadowColor:"#02040A",rimColor:"#6A28FF",lightX:-.32,lightY:-.48,specular:1.28,shininess:105,metallic:.78,roughness:.22,contrast:1.48,saturation:1.32,distortion:.52,swirl:.28,noise:.22,noiseScale:1.75,scratches:.14,spots:.12,vignette:.18 },
    cyberBlue: { ...defaults, primaryColor:"#052A73",secondaryColor:"#00C7FF",accentColor:"#BF34FF",rimColor:"#00E5FF",highlightColor:"#E9FFFF",shadowColor:"#01040C",lightX:-.18,lightY:-.64,specular:1.45,shininess:135,metallic:.82,roughness:.12,contrast:1.55,saturation:1.48,rim:.75,rimPower:1.75,iridescence:.34,iridescenceScale:3.8,chromatic:.18,bands:.12,bandAngle:62 },
    darkMetal: { ...defaults, primaryColor:"#242832",secondaryColor:"#05070B",accentColor:"#8A93A4",rimColor:"#9AA5B8",highlightColor:"#F4F7FF",shadowColor:"#010203",ambient:.11,diffuse:.72,specular:1.65,shininess:165,metallic:.98,roughness:.08,contrast:1.62,saturation:.45,rim:.28,noise:.09,scratches:.28,vignette:.28 },
    toxic: { ...defaults, primaryColor:"#1A4B05",secondaryColor:"#7BFF00",accentColor:"#D9FF19",rimColor:"#93FF00",highlightColor:"#F4FFD1",shadowColor:"#020803",lightX:-.50,lightY:-.35,ambient:.16,diffuse:1.05,specular:1.20,metallic:.46,contrast:1.45,saturation:1.62,distortion:.58,swirl:.44,noise:.32,spots:.55,rings:.18 },
    pearl: { ...defaults, primaryColor:"#E9D7F2",secondaryColor:"#A8E7FF",accentColor:"#FFB7E7",rimColor:"#D8F4FF",highlightColor:"#FFFFFF",shadowColor:"#373044",ambient:.32,diffuse:.78,specular:1.40,shininess:90,metallic:.12,roughness:.18,contrast:.96,saturation:.82,rim:.62,rimPower:1.45,iridescence:.68,iridescenceScale:2.4,vignette:.04,distortion:.04,noise:.03 },
    holographic: { ...defaults, primaryColor:"#3C31FF",secondaryColor:"#00F0FF",accentColor:"#FF35D3",rimColor:"#7CFFEF",highlightColor:"#FFFFFF",shadowColor:"#07031A",ambient:.22,diffuse:.88,specular:1.55,shininess:128,metallic:.64,roughness:.12,contrast:1.34,saturation:1.5,rim:.70,rimPower:1.3,iridescence:1.18,iridescenceScale:4.9,chromatic:.36,rings:.16,ringFrequency:4.8 },
    lava: { ...defaults, primaryColor:"#2B0200",secondaryColor:"#C71600",accentColor:"#FF9A00",rimColor:"#FF4D00",highlightColor:"#FFF1B1",shadowColor:"#020000",ambient:.10,diffuse:.95,specular:.78,shininess:45,metallic:.22,roughness:.65,contrast:1.72,saturation:1.48,rim:.45,distortion:.64,swirl:.82,noise:.46,noiseScale:2.2,rings:.35,ringFrequency:3.5,spots:.42,vignette:.22 },
    ice: { ...defaults, primaryColor:"#B9E8FF",secondaryColor:"#2D75FF",accentColor:"#E6FFFF",rimColor:"#BDEFFF",highlightColor:"#FFFFFF",shadowColor:"#07152B",ambient:.26,diffuse:.88,specular:1.65,shininess:155,metallic:.18,roughness:.08,contrast:1.18,saturation:1.05,rim:.82,rimPower:1.2,chromatic:.14,scratches:.18,noise:.10 },
    gold: { ...defaults, primaryColor:"#7E4800",secondaryColor:"#E8A514",accentColor:"#FFF0A6",rimColor:"#FFD35A",highlightColor:"#FFFFFF",shadowColor:"#140A00",ambient:.18,diffuse:.96,specular:1.72,shininess:145,metallic:.96,roughness:.10,contrast:1.42,saturation:1.25,rim:.32,noise:.06,scratches:.10,vignette:.14 },
    soft: { ...defaults, primaryColor:"#5545B8",secondaryColor:"#8DD8FF",accentColor:"#E1C8FF",rimColor:"#B9A8FF",highlightColor:"#FFFFFF",shadowColor:"#15142A",lightX:-.25,lightY:-.28,ambient:.42,diffuse:.64,specular:.56,shininess:38,metallic:.05,roughness:.65,contrast:.88,saturation:.88,rim:.25,distortion:.02,swirl:0,noise:.02,vignette:.03 }
  };

  let overlayImage = null;
  let renderTimer = null;

  function clamp(v, min=0, max=1) { return Math.min(max, Math.max(min, v)); }
  function hexToRgb(hex) { const s=String(hex).replace("#",""); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; }
  function mix(a,b,t) { return a.map((v,i)=>v+(b[i]-v)*t); }
  function luminance(c) { return c[0]*.2126+c[1]*.7152+c[2]*.0722; }
  function rotateHue(rgb, degrees) {
    const a=degrees*Math.PI/180, co=Math.cos(a), si=Math.sin(a), [r,g,b]=rgb;
    return [
      clamp((.213+.787*co-.213*si)*r+(.715-.715*co-.715*si)*g+(.072-.072*co+.928*si)*b),
      clamp((.213-.213*co+.143*si)*r+(.715+.285*co+.140*si)*g+(.072-.072*co-.283*si)*b),
      clamp((.213-.213*co-.787*si)*r+(.715-.715*co+.715*si)*g+(.072+.928*co+.072*si)*b)
    ];
  }
  function hash(x,y) { const n=Math.sin(x*127.1+y*311.7)*43758.5453123; return n-Math.floor(n); }
  function smoothNoise(x,y) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy; const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
    const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);
    return (a+(b-a)*ux)+((c+(d-c)*ux)-(a+(b-a)*ux))*uy;
  }
  function fbm(x,y) { let total=0,amp=.55,freq=1; for(let i=0;i<4;i++){total+=smoothNoise(x*freq,y*freq)*amp;freq*=2.05;amp*=.48;} return total; }

  function getParams() {
    const p={};
    colorIds.forEach(id=>p[id]=controls[id].value.toUpperCase());
    for(const [id,def] of Object.entries(numericDefs)) p[id]=Number(controls[id].value)/def[2];
    p.overlayBlend=controls.overlayBlend.value; p.outsideMode=controls.outsideMode.value; p.outsideColor=controls.outsideColor.value.toUpperCase();
    return p;
  }

  function updateLabels() {
    colorIds.forEach(id=>{ const out=$(id+"Text"); if(out) out.textContent=controls[id].value.toUpperCase(); });
    for(const [id,def] of Object.entries(numericDefs)) {
      const out=$(id+"Value"); if(!out) continue; const v=Number(controls[id].value)/def[2];
      if(id==="bandAngle"||id==="rotation"||id==="overlayRotation"||id==="hueShift") out.textContent=`${Math.round(v)}°`;
      else if(id==="posterize") out.textContent=v<=0?"Off":`${Math.round(v)} niveles`;
      else out.textContent=def[3]===0?String(Math.round(v)):v.toFixed(def[3]);
    }
    const p=getParams();
    const active=[p.distortion,p.swirl!==0?1:0,p.noise,p.rings,p.bands,p.scratches,p.spots,p.iridescence,p.chromatic,p.posterize>0?1:0,p.overlayOpacity].filter(v=>Math.abs(v)>.01).length;
    $("activeFeatureCount").textContent=`${active} efecto${active===1?"":"s"} activo${active===1?"":"s"}`;
    $("outsideColor").disabled=p.outsideMode!=="solid";
  }

  function ensureOverlayData() {
    if(!overlayImage) return null;
    if(!overlayImage._toolhubData) {
      const c=document.createElement("canvas"); c.width=c.height=512; const x=c.getContext("2d",{willReadFrequently:true});
      x.drawImage(overlayImage,0,0,512,512); overlayImage._toolhubData=x.getImageData(0,0,512,512).data;
    }
    return overlayImage._toolhubData;
  }
  function sampleOverlay(u,v) {
    const d=ensureOverlayData(); if(!d) return null; u=((u%1)+1)%1;v=((v%1)+1)%1;
    const x=Math.min(511,Math.floor(u*512)),y=Math.min(511,Math.floor((1-v)*512)),i=(y*512+x)*4; return [d[i]/255,d[i+1]/255,d[i+2]/255,d[i+3]/255];
  }
  function blend(base, top, mode, opacity) {
    if(!top||opacity<=0) return base; const result=[0,0,0];
    for(let i=0;i<3;i++) {
      const a=base[i],b=top[i]; let m=b;
      if(mode==="multiply") m=a*b; else if(mode==="screen") m=1-(1-a)*(1-b); else if(mode==="add") m=clamp(a+b); else if(mode==="overlay") m=a<.5?2*a*b:1-2*(1-a)*(1-b); else m=(1-2*b)*a*a+2*b*a;
      result[i]=a+(m-a)*opacity*(top[3]??1);
    }
    return result;
  }

  function renderMatcap(target, size, p) {
    target.width=size; target.height=size; const x=target.getContext("2d",{willReadFrequently:true}); const image=x.createImageData(size,size),data=image.data;
    const primary=hexToRgb(p.primaryColor),secondary=hexToRgb(p.secondaryColor),highlight=hexToRgb(p.highlightColor),shadow=hexToRgb(p.shadowColor),rimC=hexToRgb(p.rimColor),accent=hexToRgb(p.accentColor),outside=hexToRgb(p.outsideColor);
    let lx=p.lightX,ly=-p.lightY,lz=Math.sqrt(Math.max(.08,1-lx*lx-ly*ly)); let ll=Math.hypot(lx,ly,lz)||1;lx/=ll;ly/=ll;lz/=ll;
    const rot=p.rotation*Math.PI/180, cro=Math.cos(rot),sro=Math.sin(rot); const bandA=p.bandAngle*Math.PI/180;
    const orot=p.overlayRotation*Math.PI/180, oc=Math.cos(orot),os=Math.sin(orot);
    const poster=Math.round(p.posterize);
    for(let py=0;py<size;py++) {
      for(let px=0;px<size;px++) {
        const idx=(py*size+px)*4;
        let nx=((px+.5)/size*2-1-p.centerX)/p.zoom, ny=((py+.5)/size*2-1-p.centerY)/p.zoom;
        let tx=nx*cro-ny*sro,ty=nx*sro+ny*cro; nx=tx;ny=ty;
        const r=Math.hypot(nx,ny),r2=r*r;
        if(r2>1) {
          data[idx]=Math.round(outside[0]*255);data[idx+1]=Math.round(outside[1]*255);data[idx+2]=Math.round(outside[2]*255);data[idx+3]=p.outsideMode==="solid"?255:0; continue;
        }
        const angle=Math.atan2(ny,nx); const swirlAngle=angle+p.swirl*(1-r)*4; const warpedR=r*(1+p.distortion*.10*Math.sin(swirlAngle*5+r*11));
        let wx=Math.cos(swirlAngle)*warpedR,wy=Math.sin(swirlAngle)*warpedR;
        const n=fbm(wx*p.noiseScale*3.2+6.1,wy*p.noiseScale*3.2-3.4)-.48; wx+=n*p.distortion*.075;wy+=n*p.distortion*.075;
        const wr2=wx*wx+wy*wy; const z=Math.sqrt(Math.max(0,1-wr2));
        const ndotl=clamp(wx*lx+(-wy)*ly+z*lz,0,1);
        const diffuseTerm=Math.pow(ndotl,Math.max(.18,p.lightFalloff));
        const hx=lx,hy=ly,hz=lz+1; const hl=Math.hypot(hx,hy,hz)||1; const hnx=hx/hl,hny=hy/hl,hnz=hz/hl;
        const specDot=clamp(wx*hnx+(-wy)*hny+z*hnz,0,1); const effectiveShiny=Math.max(4,p.shininess*(1-p.roughness*.72)); const spec=Math.pow(specDot,effectiveShiny)*p.specular;
        const sx=clamp(lx+p.secondaryLightOffset*.9,-1,1),sy=clamp(ly-p.secondaryLightOffset*.55,-1,1); const sz=Math.sqrt(Math.max(.05,1-sx*sx-sy*sy)); const spec2=Math.pow(clamp(wx*sx+(-wy)*sy+z*sz,0,1),Math.max(8,effectiveShiny*.65))*p.secondaryLight;
        const lightBlob=Math.exp(-Math.pow(Math.hypot(wx-lx*.72, -wy-ly*.72)/Math.max(.04,p.lightSize),2)*2.4)*p.specular*.35;
        const directional=clamp(.5+.5*(wx*(-lx)+(-wy)*(-ly)),0,1); let mixT=clamp(.18+.62*(1-z)+.25*directional+p.gradientBias*.28,-.1,1.1); let base=mix(shadow,mix(secondary,primary,mixT),clamp(p.ambient+.78*diffuseTerm,0,1));
        let shade=p.ambient+p.diffuse*diffuseTerm; let c=base.map(v=>v*shade);
        const metal=p.metallic; c=c.map((v,i)=>v*(1-metal*.12)+highlight[i]*spec*(.48+.82*metal)+accent[i]*spec2);
        const rim=Math.pow(1-z,Math.max(.2,p.rimPower))*p.rim; c=c.map((v,i)=>v+rimC[i]*rim+mix(secondary,accent,.5)[i]*(1-z)*p.fresnelTint*.25);
        c=c.map((v,i)=>v+highlight[i]*lightBlob);
        if(p.rings>0) { const ring=.5+.5*Math.sin((warpedR*p.ringFrequency*12)+(n*4)); c=mix(c,accent,ring*p.rings*.35); }
        if(p.bands>0) { const bandCoord=wx*Math.cos(bandA)+wy*Math.sin(bandA); const b=.5+.5*Math.sin(bandCoord*28+n*5); c=mix(c,secondary,b*p.bands*.32); }
        if(p.spots>0) { const cell=fbm(wx*11.5,wy*11.5); const mask=Math.pow(clamp((cell-.44)*2.5),2); c=mix(c,accent,mask*p.spots*.48); }
        if(p.scratches>0) { const sc=hash(Math.floor((wx+1)*260),Math.floor((wy+1)*28)); const line=Math.abs(Math.sin((wx*190+wy*18+n*9)))>.986 && sc>.35 ? 1:0; c=mix(c,highlight,line*p.scratches*.72); }
        if(p.noise>0) { const grain=(fbm(wx*p.noiseScale*13+13,wy*p.noiseScale*13+7)-.5)*p.noise*.22; c=c.map(v=>v+grain); }
        if(p.iridescence>0) { const hue=(1-z)*p.iridescenceScale*130+angle*180/Math.PI*.25+p.hueShift; const iri=rotateHue([1,.18,.58],hue); c=mix(c,iri,clamp(p.iridescence*(.18+.55*(1-z)),0,.72)); }
        if(p.hueShift!==0) c=rotateHue(c,p.hueShift);
        if(p.chromatic>0) { const edge=(1-z)*p.chromatic; c[0]+=edge*.12;c[2]+=edge*.18;c[1]-=edge*.04; }
        let ou=(wx*.5+.5-.5)*p.overlayScale+.5,ov=(-wy*.5+.5-.5)*p.overlayScale+.5; const odx=ou-.5,ody=ov-.5;ou=.5+odx*oc-ody*os;ov=.5+odx*os+ody*oc; c=blend(c,sampleOverlay(ou,ov),p.overlayBlend,p.overlayOpacity);
        const lum=luminance(c); c=c.map(v=>lum+(v-lum)*p.saturation); c=c.map(v=>(v-.5)*p.contrast+.5); const expMul=Math.pow(2,p.exposure); c=c.map(v=>Math.pow(clamp(v*expMul),1/Math.max(.1,p.gamma)));
        const vig=1-p.vignette*Math.pow(r,2.2); c=c.map(v=>v*vig);
        if(poster>=2) c=c.map(v=>Math.round(clamp(v)*(poster-1))/(poster-1));
        const edgeAlpha=clamp((1-r)*size*.60,0,1);
        data[idx]=Math.round(clamp(c[0])*255);data[idx+1]=Math.round(clamp(c[1])*255);data[idx+2]=Math.round(clamp(c[2])*255);data[idx+3]=Math.round(edgeAlpha*255);
      }
    }
    x.putImageData(image,0,0);
  }

  function renderPreview() { updateLabels(); renderMatcap(canvas,512,getParams()); }
  function scheduleRender() { clearTimeout(renderTimer); renderTimer=setTimeout(renderPreview,42); }

  function applyParams(params) {
    if(!params||typeof params!=="object") return;
    colorIds.forEach(id=>{ if(params[id]&&/^#[0-9a-f]{6}$/i.test(params[id])) controls[id].value=params[id]; });
    for(const [id,def] of Object.entries(numericDefs)) {
      if(params[id]===undefined||!controls[id]) continue; const n=clamp(Number(params[id]),def[0],def[1]); if(Number.isFinite(n)) controls[id].value=String(Math.round(n*def[2]));
    }
    ["overlayBlend","outsideMode"].forEach(id=>{ if(params[id]!==undefined&&controls[id]) controls[id].value=String(params[id]); });
    if(params.outsideColor&&/^#[0-9a-f]{6}$/i.test(params.outsideColor)) controls.outsideColor.value=params.outsideColor;
    renderPreview();
  }

  function download(name,content,type) { const blob=content instanceof Blob?content:new Blob([content],{type:type||"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500); }

  Object.values(controls).filter(Boolean).forEach(el=>{el.addEventListener("input",scheduleRender);el.addEventListener("change",scheduleRender);});
  document.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>{ const p=presets[button.dataset.preset]; if(!p)return;applyParams(p);status.textContent=`Preset “${button.textContent.trim()}” aplicado.`;status.className="status-box success";}));
  $("resetMatcap").addEventListener("click",()=>{applyParams(defaults);status.textContent="MatCap restablecido.";status.className="status-box";});
  $("randomizeMatcap").addEventListener("click",()=>{ const palette=["#731526","#174BFF","#8D2BFF","#00A87C","#E45D00","#E2B229","#0C0F18","#D52678"]; applyParams({...defaults,primaryColor:palette[Math.floor(Math.random()*palette.length)],secondaryColor:palette[Math.floor(Math.random()*palette.length)],accentColor:palette[Math.floor(Math.random()*palette.length)],lightX:Math.random()*1.4-.7,lightY:Math.random()*1.4-.7,metallic:Math.random(),roughness:Math.random()*.7,contrast:.8+Math.random()*1.1,saturation:.7+Math.random()*1.1,distortion:Math.random()*.7,swirl:Math.random()*1.3-.65,noise:Math.random()*.35,rings:Math.random()>.55?Math.random()*.5:0,bands:Math.random()>.65?Math.random()*.45:0,iridescence:Math.random()>.7?Math.random()*.7:0});status.textContent="Variación aleatoria creada.";status.className="status-box success";});

  $("overlayTexture").addEventListener("change",e=>{ const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{overlayImage=img;$("overlayTextureName").textContent=file.name; if(Number($("overlayOpacity").value)===0) $("overlayOpacity").value="55";URL.revokeObjectURL(url);renderPreview();status.textContent="Textura overlay cargada localmente.";status.className="status-box success";};img.onerror=()=>URL.revokeObjectURL(url);img.src=url; });
  $("clearOverlayTexture").addEventListener("click",()=>{overlayImage=null;$("overlayTexture").value="";$("overlayTextureName").textContent="Sin textura overlay";$("overlayOpacity").value="0";renderPreview();});

  downloadButton.addEventListener("click",async()=>{ const size=Number(exportSize.value); if(![512,1024,2048,4096].includes(size))return; downloadButton.disabled=true;status.textContent=`Generando PNG ${size} × ${size}. En 4096 px puede tardar unos segundos…`;status.className="status-box";try{const out=document.createElement("canvas");await new Promise(r=>requestAnimationFrame(()=>{renderMatcap(out,size,getParams());r();}));const blob=await new Promise((res,rej)=>out.toBlob(b=>b?res(b):rej(new Error("No se pudo crear el PNG.")),"image/png"));download(`toolhub-matcap-${size}.png`,blob);status.textContent=`MatCap ${size} × ${size} generado correctamente.`;status.className="status-box success";}catch(err){status.textContent=err.message||"No se pudo exportar.";status.className="status-box error";}finally{downloadButton.disabled=false;}});
  $("downloadMatcapConfig").addEventListener("click",()=>download("toolhub-matcap-config.json",JSON.stringify({version:2,params:getParams()},null,2),"application/json"));
  $("loadMatcapConfig").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());applyParams(parsed.params||parsed);status.textContent="Configuración JSON cargada.";status.className="status-box success";}catch{status.textContent="El JSON no contiene una configuración válida.";status.className="status-box error";}e.target.value="";});
  $("savePresetLocal").addEventListener("click",()=>{try{localStorage.setItem(LOCAL_PRESET_KEY,JSON.stringify(getParams()));status.textContent="Configuración guardada en este navegador.";status.className="status-box success";}catch{status.textContent="El navegador no permitió guardar la configuración.";status.className="status-box error";}});
  $("loadPresetLocal").addEventListener("click",()=>{try{const raw=localStorage.getItem(LOCAL_PRESET_KEY);if(!raw)throw new Error();applyParams(JSON.parse(raw));status.textContent="Configuración local recuperada.";status.className="status-box success";}catch{status.textContent="No hay una configuración local guardada.";status.className="status-box error";}});

  function readMemory(){try{const raw=localStorage.getItem(MEMORY_KEY);if(!raw)return"";const p=JSON.parse(raw);return typeof p.summary==="string"?p.summary.slice(0,2500):"";}catch{return"";}}
  function writeMemory(summary){try{localStorage.setItem(MEMORY_KEY,JSON.stringify({summary:String(summary).slice(0,2500),updatedAt:new Date().toISOString()}));}catch{}}
  function updateMemoryDisplay(){const m=readMemory();$("matcapMemoryText").textContent=m||"Sin preferencias guardadas todavía.";}
  $("clearMatcapMemory").addEventListener("click",()=>{try{localStorage.removeItem(MEMORY_KEY);}catch{}updateMemoryDisplay();$("aiResult").textContent="Memoria local borrada.";$("aiResult").className="ai-result";});

  function colorFromWords(text) {
    const map=[
      [["rojo vino","vino","burdeos"],"#731526"],[["rojo"],"#B5182B"],[["azul cian","cian","cyan"],"#00BFEF"],[["azul"],"#1F4CFF"],[["morado","violeta","purple"],"#7B2CFF"],[["rosa","magenta"],"#FF2D91"],[["verde toxico","tóxico","toxico","acid"],"#79FF00"],[["verde"],"#19B866"],[["naranja"],"#FF6A00"],[["dorado","oro"],"#D99B17"],[["amarillo"],"#FFD52A"],[["negro"],"#07090E"],[["blanco"],"#F7FAFF"]
    ];
    for(const [words,color] of map) if(words.some(w=>text.includes(w))) return color; return null;
  }
  function localInterpretPrompt(prompt) {
    const t=prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); let p={...getParams()};
    const hex=[...prompt.matchAll(/#[0-9a-fA-F]{6}/g)].map(m=>m[0].toUpperCase()); if(hex[0])p.primaryColor=hex[0];if(hex[1])p.secondaryColor=hex[1];if(hex[2])p.accentColor=hex[2];
    const main=colorFromWords(t); if(main)p.primaryColor=main;
    if(t.includes("azul")&&main!=="#1F4CFF") p.secondaryColor="#1F4CFF"; if(t.includes("morado"))p.secondaryColor="#702BFF"; if(t.includes("negro"))p.shadowColor="#010207"; if(t.includes("blanco"))p.highlightColor="#FFFFFF";
    if(t.includes("metal")||t.includes("metalico")){p.metallic=.9;p.roughness=.12;p.specular=1.55;p.shininess=145;}
    if(t.includes("mate")){p.metallic=.08;p.roughness=.82;p.specular=.35;p.shininess=24;}
    if(t.includes("brillante")||t.includes("reflejo fuerte")){p.specular=1.7;p.shininess=155;p.highlightColor="#FFFFFF";}
    if(t.includes("oscuro")){p.ambient=.10;p.vignette=.28;p.contrast=1.55;}
    if(t.includes("suave")){p.ambient=.38;p.diffuse=.68;p.specular=.55;p.roughness=.58;p.contrast=.92;p.distortion=.03;p.noise=.02;}
    if(t.includes("agresivo")){p.contrast=1.72;p.saturation=1.45;p.rim=.7;p.distortion=.45;}
    if(t.includes("corrosivo")||t.includes("corrosion")){p.distortion=.68;p.swirl=.46;p.noise=.38;p.spots=.45;p.scratches=.18;}
    if(t.includes("holografico")||t.includes("iridiscente")||t.includes("arcoiris")){p.iridescence=1.1;p.iridescenceScale=4.4;p.chromatic=.28;p.metallic=.58;p.rim=.75;}
    if(t.includes("neon")){p.saturation=1.65;p.rim=.9;p.specular=1.45;p.contrast=1.5;p.accentColor="#FF28D7";}
    if(t.includes("toxico")||t.includes("toxic")){p.primaryColor="#214C06";p.secondaryColor="#77FF00";p.accentColor="#D5FF25";p.spots=.52;p.distortion=.55;}
    if(t.includes("lava")){p.primaryColor="#2A0100";p.secondaryColor="#B91600";p.accentColor="#FF7A00";p.swirl=.75;p.rings=.32;p.spots=.35;p.roughness=.62;}
    if(t.includes("hielo")||t.includes("ice")){p.primaryColor="#B9E8FF";p.secondaryColor="#2D75FF";p.rimColor="#D8F7FF";p.rim=.85;p.specular=1.65;p.shininess=160;p.roughness=.08;}
    if(t.includes("perla")||t.includes("pearl")){Object.assign(p,presets.pearl);}
    if(t.includes("oro")||t.includes("dorado")){Object.assign(p,presets.gold);}
    if(t.includes("aranazo")||t.includes("arañazo")||t.includes("rayado"))p.scratches=.38;
    if(t.includes("anillos")||t.includes("ondas"))p.rings=.45; if(t.includes("bandas"))p.bands=.42; if(t.includes("remolino"))p.swirl=.78; if(t.includes("ruido")||t.includes("granulado"))p.noise=.35;
    if(t.includes("borde fuerte")||t.includes("rim fuerte"))p.rim=1.05; if(t.includes("sin borde")||t.includes("sin rim"))p.rim=0;
    return p;
  }

  const assistantMode=$("assistantMode"), assistantStatus=$("assistantStatus"), aiResult=$("aiResult"), ollamaModel=$("ollamaModel"), ollamaWrap=$("ollamaModelWrap"), ollamaHelp=$("ollamaHelp");
  function setAssistantUi(){ const mode=assistantMode.value;ollamaWrap.hidden=mode!=="ollama";ollamaHelp.hidden=mode!=="ollama";assistantStatus.className="assistant-status"; if(mode==="local"){assistantStatus.textContent="Local gratis";$("checkAssistant").textContent="Comprobar modo";}else if(mode==="ollama"){assistantStatus.textContent="Ollama sin comprobar";$("checkAssistant").textContent="Detectar Ollama";}else{assistantStatus.textContent="OpenAI sin comprobar";$("checkAssistant").textContent="Comprobar OpenAI";} }
  assistantMode.addEventListener("change",setAssistantUi);

  async function checkAssistant(){ const mode=assistantMode.value;if(mode==="local"){assistantStatus.textContent="Listo · gratis";assistantStatus.className="assistant-status";aiResult.textContent="Modo local listo. No requiere servidor, cuenta, API ni conexión.";aiResult.className="ai-result success";return;}
    try{
      if(mode==="ollama") { const r=await fetch("/api/ollama/models");const d=await r.json();if(!r.ok||!d.available)throw new Error(d.error||"Ollama no está disponible.");ollamaModel.innerHTML="";(d.models||[]).forEach(m=>{const o=document.createElement("option");o.value=m;o.textContent=m;ollamaModel.appendChild(o);});if(!d.models?.length){const o=document.createElement("option");o.value="";o.textContent="No hay modelos instalados";ollamaModel.appendChild(o);}assistantStatus.textContent="Ollama conectado";assistantStatus.className="assistant-status";aiResult.textContent=d.models?.length?`Ollama detectado. ${d.models.length} modelo(s) disponible(s).`:`Ollama funciona, pero debes descargar un modelo primero.`;aiResult.className="ai-result success";
      } else { const r=await fetch("/api/health");const d=await r.json();if(!r.ok||!d.openaiConfigured)throw new Error("OpenAI no tiene API key configurada.");assistantStatus.textContent="OpenAI conectado";assistantStatus.className="assistant-status";aiResult.textContent=`OpenAI está configurado (${d.model||"modelo configurado"}).`;aiResult.className="ai-result success"; }
    }catch(err){assistantStatus.textContent="No conectado";assistantStatus.className="assistant-status offline";aiResult.textContent=err.message||"No se pudo comprobar la conexión.";aiResult.className="ai-result error";}
  }
  $("checkAssistant").addEventListener("click",checkAssistant);

  $("applyAssistant").addEventListener("click",async()=>{const prompt=$("aiPrompt").value.trim();if(!prompt){aiResult.textContent="Describe primero el MatCap que quieres.";aiResult.className="ai-result error";$("aiPrompt").focus();return;}const mode=assistantMode.value;$("applyAssistant").disabled=true;aiResult.textContent="Generando configuración…";aiResult.className="ai-result";try{
    let result;
    if(mode==="local") result={params:localInterpretPrompt(prompt),message:"Configuración creada con el asistente local gratuito. Puedes seguir retocándola manualmente.",memory:`Preferencias de MatCap: ${prompt.slice(0,600)}`};
    else { const endpoint=mode==="ollama"?"/api/matcap/ollama":"/api/matcap/suggest";const body={prompt,currentParams:getParams(),memory:$("rememberMatcap").checked?readMemory():""};if(mode==="ollama")body.model=ollamaModel.value;const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});result=await r.json().catch(()=>({}));if(!r.ok)throw new Error(result.error||"No se pudo generar la configuración.");}
    applyParams(result.params);if($("rememberMatcap").checked){writeMemory(result.memory||`Preferencias de MatCap: ${prompt.slice(0,600)}`);updateMemoryDisplay();}aiResult.textContent=result.message||"Configuración aplicada.";aiResult.className="ai-result success";status.textContent=`Configuración aplicada mediante ${mode==="local"?"modo local":mode==="ollama"?"Ollama":"OpenAI"}.`;status.className="status-box success";
  }catch(err){aiResult.textContent=err.message||"No se pudo generar la configuración.";aiResult.className="ai-result error";}finally{$("applyAssistant").disabled=false;}});

  updateLabels();renderPreview();updateMemoryDisplay();setAssistantUi();
})();
