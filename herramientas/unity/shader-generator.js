(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("shaderPreview");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const codeEl = $("shaderCode");
  const status = $("shaderStatus");
  const summary = $("shaderSummary");
  const lineCount = $("codeLineCount");

  const ids = [
    "shaderName","shaderType","renderMode","cullMode","baseColor","metallic","smoothness","normalStrength","opacity","cutoff","tiling",
    "enableEmission","enableRim","enableMatcap","enableDissolve","enableHue","emissionColor","emissionIntensity","rimColor","rimPower","rimIntensity","matcapStrength","dissolve","dissolveEdge","hue",
    "enableUvScroll","enableUvRotate","enablePulse","enableWave","animateHue","scrollX","scrollY","rotationSpeed","pulseSpeed","pulseStrength","hueSpeed","waveAmp","waveFreq","waveSpeed",
    "previewShape","previewBackground"
  ];
  const controls = Object.fromEntries(ids.map((id) => [id, $(id)]));

  const textures = { albedo:null, normal:null, emission:null, matcap:null };
  let playing = true;
  let startTime = performance.now();
  let pausedTime = 0;
  let lastFrame = 0;

  const defaultState = {
    shaderName:"ToolHub/CustomShader", shaderType:"lit", renderMode:"opaque", cullMode:"Back", baseColor:"#6f35ff",
    metallic:20, smoothness:65, normalStrength:100, opacity:100, cutoff:50, tiling:100,
    enableEmission:false, enableRim:true, enableMatcap:false, enableDissolve:false, enableHue:false,
    emissionColor:"#33a6ff", emissionIntensity:100, rimColor:"#b663ff", rimPower:280, rimIntensity:80, matcapStrength:75, dissolve:0, dissolveEdge:8, hue:0,
    enableUvScroll:false, enableUvRotate:false, enablePulse:false, enableWave:false, animateHue:false,
    scrollX:25, scrollY:0, rotationSpeed:45, pulseSpeed:200, pulseStrength:50, hueSpeed:30, waveAmp:10, waveFreq:350, waveSpeed:180,
    previewShape:"sphere", previewBackground:"studio"
  };

  const presets = {
    toon:{baseColor:"#7b53ff",metallic:0,smoothness:35,enableRim:true,rimColor:"#a98cff",rimPower:350,rimIntensity:55,enableEmission:false,enableMatcap:false,enableDissolve:false,enableUvScroll:false,enableUvRotate:false,enablePulse:false,enableWave:false,enableHue:false,animateHue:false,renderMode:"opaque"},
    hologram:{baseColor:"#22c8ff",metallic:10,smoothness:80,enableEmission:true,emissionColor:"#00d9ff",emissionIntensity:220,enableRim:true,rimColor:"#80f5ff",rimPower:180,rimIntensity:180,enableHue:true,animateHue:true,hueSpeed:18,enableUvScroll:true,scrollX:0,scrollY:35,enablePulse:true,pulseSpeed:260,pulseStrength:60,renderMode:"transparent",opacity:68},
    lava:{baseColor:"#8f1300",metallic:15,smoothness:45,enableEmission:true,emissionColor:"#ff5a00",emissionIntensity:320,enableRim:true,rimColor:"#ffae32",rimPower:230,rimIntensity:90,enableUvScroll:true,scrollX:12,scrollY:18,enablePulse:true,pulseSpeed:120,pulseStrength:45,enableHue:false,enableDissolve:true,dissolve:12,dissolveEdge:12,renderMode:"opaque"},
    ghost:{baseColor:"#83cfff",metallic:0,smoothness:25,enableEmission:true,emissionColor:"#63bfff",emissionIntensity:110,enableRim:true,rimColor:"#d9f5ff",rimPower:120,rimIntensity:180,enablePulse:true,pulseSpeed:160,pulseStrength:30,renderMode:"transparent",opacity:38},
    cyber:{baseColor:"#19005f",metallic:65,smoothness:90,enableEmission:true,emissionColor:"#ff27d8",emissionIntensity:250,enableRim:true,rimColor:"#2c88ff",rimPower:260,rimIntensity:120,enableHue:true,animateHue:true,hueSpeed:12,enableUvRotate:true,rotationSpeed:18,enablePulse:true,pulseSpeed:230,pulseStrength:35,renderMode:"opaque"},
    metal:{baseColor:"#707784",metallic:95,smoothness:92,enableEmission:false,enableRim:true,rimColor:"#ffffff",rimPower:480,rimIntensity:35,enableMatcap:true,matcapStrength:60,renderMode:"opaque"}
  };

  const rangeFormat = {
    metallic:v=>(v/100).toFixed(2), smoothness:v=>(v/100).toFixed(2), normalStrength:v=>(v/100).toFixed(2), opacity:v=>(v/100).toFixed(2), cutoff:v=>(v/100).toFixed(2), tiling:v=>(v/100).toFixed(2),
    emissionIntensity:v=>(v/100).toFixed(2), rimPower:v=>(v/100).toFixed(2), rimIntensity:v=>(v/100).toFixed(2), matcapStrength:v=>(v/100).toFixed(2), dissolve:v=>(v/100).toFixed(2), dissolveEdge:v=>(v/100).toFixed(2), hue:v=>`${v}°`,
    scrollX:v=>(v/100).toFixed(2), scrollY:v=>(v/100).toFixed(2), rotationSpeed:v=>`${v}°`, pulseSpeed:v=>(v/100).toFixed(2), pulseStrength:v=>(v/100).toFixed(2), hueSpeed:v=>`${v}°/s`, waveAmp:v=>(v/100).toFixed(2), waveFreq:v=>(v/100).toFixed(2), waveSpeed:v=>(v/100).toFixed(2)
  };

  function clamp(v,a=0,b=1){ return Math.min(b,Math.max(a,v)); }
  function hexToRgb(hex){ const s=hex.replace("#",""); return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]; }
  function rgbToHex(c){ return "#"+c.map(v=>Math.round(clamp(v)*255).toString(16).padStart(2,"0")).join(""); }
  function hsvRotate(rgb, deg){
    const a=deg*Math.PI/180, cos=Math.cos(a), sin=Math.sin(a);
    const [r,g,b]=rgb;
    return [
      clamp((.213+.787*cos-.213*sin)*r+(.715-.715*cos-.715*sin)*g+(.072-.072*cos+.928*sin)*b),
      clamp((.213-.213*cos+.143*sin)*r+(.715+.285*cos+.140*sin)*g+(.072-.072*cos-.283*sin)*b),
      clamp((.213-.213*cos-.787*sin)*r+(.715-.715*cos+.715*sin)*g+(.072+.928*cos+.072*sin)*b)
    ];
  }
  function mix(a,b,t){ return a.map((v,i)=>v+(b[i]-v)*t); }
  function noise(x,y){ const n=Math.sin(x*12.9898+y*78.233)*43758.5453; return n-Math.floor(n); }

  function state(){
    const s={};
    for(const id of ids){ const el=controls[id]; if(!el) continue; s[id]=el.type==="checkbox"?el.checked:el.type==="range"?Number(el.value):el.value; }
    return s;
  }

  function applyState(partial){
    for(const [id,val] of Object.entries(partial)){
      const el=controls[id]; if(!el) continue;
      if(el.type==="checkbox") el.checked=Boolean(val); else el.value=String(val);
    }
    syncUi();
  }

  function syncUi(){
    for(const [id,fmt] of Object.entries(rangeFormat)){
      const el=controls[id], out=$(id+"Value"); if(el&&out) out.textContent=fmt(Number(el.value));
    }
    const s=state();
    controls.cutoff.closest("label").style.opacity=s.renderMode==="cutout"?"1":".45";
    updateSummary(s);
    const code=buildShader(s); codeEl.textContent=code; lineCount.textContent=`${code.split("\n").length} líneas`;
  }

  function updateSummary(s){
    const tags=[
      [s.shaderType==="lit"?"Lit":"Unlit",true],[s.renderMode,true],["Rim",s.enableRim],["Emission",s.enableEmission],["MatCap",s.enableMatcap],["Dissolve",s.enableDissolve],["Hue",s.enableHue],["UV Scroll",s.enableUvScroll],["UV Rotate",s.enableUvRotate],["Pulse",s.enablePulse],["Vertex Wave",s.enableWave]
    ];
    summary.innerHTML=tags.map(([t,on])=>`<span class="${on?"active":""}">${t}</span>`).join("");
  }

  async function loadImage(file,key,nameId){
    if(!file) return;
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{ textures[key]=img; $(nameId).textContent=file.name; URL.revokeObjectURL(url); status.textContent=`Textura ${file.name} cargada solo para la vista previa.`; status.className="status-box success"; };
    img.onerror=()=>{URL.revokeObjectURL(url);}; img.src=url;
  }

  [["albedoUpload","albedo","albedoName"],["normalUpload","normal","normalName"],["emissionUpload","emission","emissionName"],["matcapUpload","matcap","matcapName"]].forEach(([id,key,name])=>{
    $(id).addEventListener("change",e=>loadImage(e.target.files?.[0],key,name));
  });
  $("clearTextures").addEventListener("click",()=>{ Object.keys(textures).forEach(k=>textures[k]=null); ["albedoName","normalName","emissionName","matcapName"].forEach(id=>$(id).textContent="Sin textura"); ["albedoUpload","normalUpload","emissionUpload","matcapUpload"].forEach(id=>$(id).value=""); status.textContent="Texturas de preview eliminadas."; status.className="status-box"; });

  function sampleTexture(img,u,v){
    if(!img) return null;
    if(!img._toolhubCanvas){ const c=document.createElement("canvas"); c.width=c.height=256; const x=c.getContext("2d",{willReadFrequently:true}); x.drawImage(img,0,0,256,256); img._toolhubCanvas=c; img._toolhubData=x.getImageData(0,0,256,256).data; }
    u=((u%1)+1)%1; v=((v%1)+1)%1; const px=Math.min(255,Math.floor(u*256)), py=Math.min(255,Math.floor((1-v)*256)); const i=(py*256+px)*4, d=img._toolhubData; return [d[i]/255,d[i+1]/255,d[i+2]/255,d[i+3]/255];
  }

  function drawBackground(mode){
    const w=canvas.width,h=canvas.height;
    if(mode==="dark"){ctx.fillStyle="#060910";ctx.fillRect(0,0,w,h);return;}
    if(mode==="checker"){const q=24; for(let y=0;y<h;y+=q)for(let x=0;x<w;x+=q){ctx.fillStyle=((x/q+y/q)%2)?"#131a27":"#0b1019";ctx.fillRect(x,y,q,q);} return;}
    const g=ctx.createRadialGradient(w*.42,h*.34,20,w*.5,h*.5,w*.65);g.addColorStop(0,"#18243b");g.addColorStop(.6,"#0b111d");g.addColorStop(1,"#05080e");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }

  function renderPreview(time){
    const s=state(); const t=playing?(time-startTime)/1000:pausedTime;
    drawBackground(s.previewBackground);
    const w=canvas.width,h=canvas.height; const img=ctx.createImageData(w,h), d=img.data;
    const base=hexToRgb(s.baseColor), emission=hexToRgb(s.emissionColor), rimColor=hexToRgb(s.rimColor);
    const tiling=s.tiling/100, scroll=[s.scrollX/100,s.scrollY/100]; const rot=(s.enableUvRotate?s.rotationSpeed*t:0)*Math.PI/180; const cr=Math.cos(rot), sr=Math.sin(rot);
    const hueDeg=s.hue+(s.enableHue&&s.animateHue?s.hueSpeed*t:0);
    const pulse=s.enablePulse ? (0.5+0.5*Math.sin(t*s.pulseSpeed*2))*s.pulseStrength/100 : 0;
    const sphere=s.previewShape==="sphere";
    for(let y=0;y<h;y++){
      const ny=(y/(h-1))*2-1;
      for(let x=0;x<w;x++){
        const nx=(x/(w-1))*2-1; const idx=(y*w+x)*4;
        let inside=true,z=1,nxx=0,nyy=0;
        if(sphere){ const r2=nx*nx+ny*ny; inside=r2<=.78; if(!inside){d[idx+3]=0;continue;} nxx=nx/Math.sqrt(.78); nyy=-ny/Math.sqrt(.78); z=Math.sqrt(Math.max(0,1-nxx*nxx-nyy*nyy)); }
        else { if(Math.abs(nx)>.82||Math.abs(ny)>.82){d[idx+3]=0;continue;} nxx=0;nyy=0;z=1; }
        let u=sphere?(Math.atan2(nxx,z)/(2*Math.PI)+.5):(nx*.5+.5); let v=sphere?(Math.asin(clamp(nyy,-1,1))/Math.PI+.5):(-ny*.5+.5);
        u=(u-.5)*tiling+.5; v=(v-.5)*tiling+.5;
        if(s.enableUvScroll){u+=scroll[0]*t;v+=scroll[1]*t;}
        if(s.enableUvRotate){const dx=u-.5,dy=v-.5;u=.5+dx*cr-dy*sr;v=.5+dx*sr+dy*cr;}
        const tex=sampleTexture(textures.albedo,u,v); let color=tex?mix(base,tex.slice(0,3),.82):base.slice(); color=hsvRotate(color,hueDeg);
        let normal=[nxx,nyy,z];
        const ntex=sampleTexture(textures.normal,u,v); if(ntex){ const str=s.normalStrength/100; normal=[clamp((ntex[0]*2-1)*str+nxx,-1,1),clamp((ntex[1]*2-1)*str+nyy,-1,1),z]; const l=Math.hypot(...normal)||1; normal=normal.map(vv=>vv/l); }
        let light=s.shaderType==="unlit"?1:clamp(.18+Math.max(0,normal[0]*-.35+normal[1]*.5+normal[2]*.79)*.95,0,1.25);
        const spec=s.shaderType==="unlit"?0:Math.pow(clamp(normal[2],0,1),8+80*s.smoothness/100)*(0.15+0.85*s.smoothness/100);
        color=color.map(c=>c*light+spec*(.35+.65*s.metallic/100));
        if(s.enableMatcap){const m=sampleTexture(textures.matcap,normal[0]*.5+.5,normal[1]*.5+.5); const mc=m?m.slice(0,3):[.25+.7*z,.15+.45*normal[1]+.25,.45+.5*normal[0]]; color=mix(color,mc,s.matcapStrength/100*.65);}
        if(s.enableRim&&sphere){const rim=Math.pow(1-clamp(z,0,1),Math.max(.5,s.rimPower/100))*s.rimIntensity/100; color=color.map((c,i)=>c+rimColor[i]*rim);}
        if(s.enableEmission){const eTex=sampleTexture(textures.emission,u,v); const e=eTex?eTex.slice(0,3):emission; const inten=s.emissionIntensity/100*(1+pulse); color=color.map((c,i)=>c+e[i]*inten*.45);}
        if(s.enablePulse&&!s.enableEmission){ color=color.map(c=>c*(1+pulse*.35)); }
        let alpha=s.opacity/100*(tex?tex[3]:1);
        if(s.enableDissolve){const n=noise(u*14+Math.sin(v*9),v*14); const threshold=s.dissolve/100; const edge=s.dissolveEdge/100; if(n<threshold){alpha=0;} else if(n<threshold+edge){color=mix(color,emission,.8);} }
        if(s.renderMode==="cutout"&&alpha<s.cutoff/100) alpha=0; if(s.renderMode==="opaque") alpha=1;
        d[idx]=Math.round(clamp(color[0])*255);d[idx+1]=Math.round(clamp(color[1])*255);d[idx+2]=Math.round(clamp(color[2])*255);d[idx+3]=Math.round(clamp(alpha)*255);
      }
    }
    const off=document.createElement("canvas");off.width=w;off.height=h;off.getContext("2d").putImageData(img,0,0);ctx.drawImage(off,0,0);
    if(playing) requestAnimationFrame(loop);
  }
  function loop(ts){ if(ts-lastFrame<33){requestAnimationFrame(loop);return;} lastFrame=ts; renderPreview(ts); }

  function shaderIdentifier(name){ return String(name||"ToolHub/CustomShader").replace(/[\r\n\"]+/g," ").trim().slice(0,80)||"ToolHub/CustomShader"; }
  function f(v,d=2){ return Number(v).toFixed(d); }
  function colorProperty(hex){ const [r,g,b]=hexToRgb(hex); return `(${f(r,3)},${f(g,3)},${f(b,3)},1)`; }

  function buildShader(s){
    const name=shaderIdentifier(s.shaderName); const transparent=s.renderMode==="transparent"; const cutout=s.renderMode==="cutout";
    const props=[
      `    _Color ("Color", Color) = ${colorProperty(s.baseColor)}`,
      `    _MainTex ("Main Texture", 2D) = "white" {}`,
      `    _Metallic ("Metallic", Range(0,1)) = ${f(s.metallic/100)}`,
      `    _Smoothness ("Smoothness", Range(0,1)) = ${f(s.smoothness/100)}`,
      `    _Opacity ("Opacity", Range(0,1)) = ${f(s.opacity/100)}`,
      `    _Tiling ("Tiling", Float) = ${f(s.tiling/100)}`
    ];
    if(cutout) props.push(`    _Cutoff ("Alpha Cutoff", Range(0,1)) = ${f(s.cutoff/100)}`);
    props.push(`    _BumpMap ("Normal Map", 2D) = "bump" {}`,`    _NormalStrength ("Normal Strength", Range(0,2)) = ${f(s.normalStrength/100)}`);
    if(s.enableEmission) props.push(`    _EmissionMap ("Emission Map", 2D) = "white" {}`,`    _EmissionColor ("Emission Color", Color) = ${colorProperty(s.emissionColor)}`,`    _EmissionIntensity ("Emission Intensity", Range(0,5)) = ${f(s.emissionIntensity/100)}`);
    else if(s.enableDissolve) props.push(`    _EmissionColor ("Dissolve Edge Color", Color) = ${colorProperty(s.emissionColor)}`);
    if(s.enableRim) props.push(`    _RimColor ("Rim Color", Color) = ${colorProperty(s.rimColor)}`,`    _RimPower ("Rim Power", Range(0.5,8)) = ${f(s.rimPower/100)}`,`    _RimIntensity ("Rim Intensity", Range(0,3)) = ${f(s.rimIntensity/100)}`);
    if(s.enableMatcap) props.push(`    _MatCap ("MatCap", 2D) = "gray" {}`,`    _MatCapStrength ("MatCap Strength", Range(0,2)) = ${f(s.matcapStrength/100)}`);
    if(s.enableDissolve) props.push(`    _Dissolve ("Dissolve", Range(0,1)) = ${f(s.dissolve/100)}`,`    _DissolveEdge ("Dissolve Edge", Range(0.001,0.3)) = ${f(s.dissolveEdge/100,3)}`);
    if(s.enableHue) props.push(`    _Hue ("Hue Shift", Range(0,360)) = ${Number(s.hue)}`);
    if(s.enableUvScroll) props.push(`    _UVScroll ("UV Scroll XY", Vector) = (${f(s.scrollX/100)},${f(s.scrollY/100)},0,0)`);
    if(s.enableUvRotate) props.push(`    _UVRotationSpeed ("UV Rotation Speed", Float) = ${Number(s.rotationSpeed)}`);
    if(s.enablePulse) props.push(`    _PulseSpeed ("Pulse Speed", Float) = ${f(s.pulseSpeed/100)}`,`    _PulseStrength ("Pulse Strength", Range(0,2)) = ${f(s.pulseStrength/100)}`);
    if(s.enableHue&&s.animateHue) props.push(`    _HueSpeed ("Hue Speed", Float) = ${Number(s.hueSpeed)}`);
    if(s.enableWave) props.push(`    _WaveAmplitude ("Wave Amplitude", Range(0,1)) = ${f(s.waveAmp/100)}`,`    _WaveFrequency ("Wave Frequency", Float) = ${f(s.waveFreq/100)}`,`    _WaveSpeed ("Wave Speed", Float) = ${f(s.waveSpeed/100)}`);

    const tags=transparent?'Tags { "RenderType"="Transparent" "Queue"="Transparent" }':cutout?'Tags { "RenderType"="TransparentCutout" "Queue"="AlphaTest" }':'Tags { "RenderType"="Opaque" "Queue"="Geometry" }';
    const pragma='#pragma surface surf Standard fullforwardshadows vertex:vert'+(transparent?' alpha:fade':'');
    const vars=[`sampler2D _MainTex;`,`fixed4 _Color;`,`half _Metallic;`,`half _Smoothness;`,`half _Opacity;`,`float _Tiling;`,`sampler2D _BumpMap;`,`half _NormalStrength;`];
    if(cutout) vars.push(`half _Cutoff;`);
    if(s.enableEmission) vars.push(`sampler2D _EmissionMap;`,`fixed4 _EmissionColor;`,`half _EmissionIntensity;`);
    else if(s.enableDissolve) vars.push(`fixed4 _EmissionColor;`);
    if(s.enableRim) vars.push(`fixed4 _RimColor;`,`half _RimPower;`,`half _RimIntensity;`);
    if(s.enableMatcap) vars.push(`sampler2D _MatCap;`,`half _MatCapStrength;`);
    if(s.enableDissolve) vars.push(`half _Dissolve;`,`half _DissolveEdge;`);
    if(s.enableHue) vars.push(`half _Hue;`);
    if(s.enableUvScroll) vars.push(`float4 _UVScroll;`);
    if(s.enableUvRotate) vars.push(`float _UVRotationSpeed;`);
    if(s.enablePulse) vars.push(`float _PulseSpeed;`,`half _PulseStrength;`);
    if(s.enableHue&&s.animateHue) vars.push(`float _HueSpeed;`);
    if(s.enableWave) vars.push(`float _WaveAmplitude;`,`float _WaveFrequency;`,`float _WaveSpeed;`);

    const helpers=[];
    if(s.enableHue) helpers.push(`fixed3 RotateHue(fixed3 c, float degrees) {\n  float a = radians(degrees);\n  float co = cos(a), si = sin(a);\n  return saturate(fixed3(\n    (.213+.787*co-.213*si)*c.r + (.715-.715*co-.715*si)*c.g + (.072-.072*co+.928*si)*c.b,\n    (.213-.213*co+.143*si)*c.r + (.715+.285*co+.140*si)*c.g + (.072-.072*co-.283*si)*c.b,\n    (.213-.213*co-.787*si)*c.r + (.715-.715*co+.715*si)*c.g + (.072+.928*co+.072*si)*c.b));\n}`);
    if(s.enableDissolve) helpers.push(`float ToolHubNoise(float3 p) { return frac(sin(dot(p, float3(12.9898,78.233,37.719))) * 43758.5453); }`);

    const vertBody=s.enableWave?`  float wave = sin((v.vertex.x + v.vertex.y + v.vertex.z) * _WaveFrequency + _Time.y * _WaveSpeed);\n  v.vertex.xyz += v.normal * wave * _WaveAmplitude;`:`  // Sin deformación de vértices.`;
    const uvLines=[`  float2 uv = IN.uv_MainTex * _Tiling;`];
    if(s.enableUvScroll) uvLines.push(`  uv += _UVScroll.xy * _Time.y;`);
    if(s.enableUvRotate) uvLines.push(`  float angle = radians(_UVRotationSpeed) * _Time.y;`,`  float2 p = uv - 0.5;`,`  uv = float2(p.x*cos(angle)-p.y*sin(angle), p.x*sin(angle)+p.y*cos(angle)) + 0.5;`);
    const surf=[];
    surf.push(...uvLines,`  fixed4 c = tex2D(_MainTex, uv) * _Color;`);
    if(s.enableHue) surf.push(`  c.rgb = RotateHue(c.rgb, _Hue${s.animateHue?' + _HueSpeed * _Time.y':''});`);
    surf.push(s.shaderType==="unlit"?`  o.Albedo = 0;`:`  o.Albedo = c.rgb;`,`  o.Metallic = _Metallic;`,`  o.Smoothness = _Smoothness;`,`  fixed3 n = UnpackNormal(tex2D(_BumpMap, uv));`,`  n.xy *= _NormalStrength;`,`  o.Normal = normalize(n);`);
    if(cutout) surf.push(`  clip(c.a * _Opacity - _Cutoff);`);
    surf.push(`  o.Alpha = c.a * _Opacity;`);
    surf.push(`  fixed3 emission = ${s.shaderType==="unlit"?"c.rgb":"0"};`);
    if(s.enableEmission) surf.push(`  emission += tex2D(_EmissionMap, uv).rgb * _EmissionColor.rgb * _EmissionIntensity;`);
    if(s.enablePulse) surf.push(`  emission *= 1 + (0.5 + 0.5 * sin(_Time.y * _PulseSpeed * 6.2831853)) * _PulseStrength;`);
    if(s.enableRim) surf.push(`  half rim = pow(1.0 - saturate(dot(normalize(IN.viewDir), o.Normal)), _RimPower);`,`  emission += _RimColor.rgb * rim * _RimIntensity;`);
    if(s.enableMatcap) surf.push(`  float3 worldN = WorldNormalVector(IN, o.Normal);`,`  float3 viewN = mul((float3x3)UNITY_MATRIX_V, worldN);`,`  float2 matUV = viewN.xy * 0.5 + 0.5;`,`  emission += tex2D(_MatCap, matUV).rgb * _MatCapStrength;`);
    if(s.enableDissolve) surf.push(`  float dn = ToolHubNoise(IN.worldPos * 9.0);`,`  clip(dn - _Dissolve);`,`  half edge = 1.0 - smoothstep(_Dissolve, _Dissolve + _DissolveEdge, dn);`,`  emission += _EmissionColor.rgb * edge;`);
    surf.push(`  o.Emission = emission;`);

    return `Shader "${name}"\n{\n  Properties\n  {\n${props.join("\n")}\n  }\n\n  SubShader\n  {\n    ${tags}\n    LOD 300\n    Cull ${s.cullMode}\n${transparent?'    Blend SrcAlpha OneMinusSrcAlpha\n    ZWrite Off\n':''}\n    CGPROGRAM\n    ${pragma}\n    #pragma target 3.0\n\n    ${vars.join("\n    ")}\n\n    struct Input\n    {\n      float2 uv_MainTex;\n      float3 viewDir;\n      float3 worldPos;\n      float3 worldNormal;\n      INTERNAL_DATA\n    };\n\n${helpers.map(h=>'    '+h.replace(/\n/g,'\n    ')).join("\n\n")}\n\n    void vert(inout appdata_full v)\n    {\n${vertBody}\n    }\n\n    void surf(Input IN, inout SurfaceOutputStandard o)\n    {\n${surf.join("\n")}\n    }\n    ENDCG\n  }\n  FallBack "Diffuse"\n}\n`;
  }

  function download(name,text,type="text/plain") { const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200); }
  $("downloadShader").addEventListener("click",()=>{ const s=state(); const filename=shaderIdentifier(s.shaderName).split("/").pop().replace(/[^a-z0-9_-]+/gi,"-")||"ToolHubShader"; download(`${filename}.shader`,buildShader(s)); status.textContent="Shader descargado. Importa el archivo en Assets y crea un Material con él."; status.className="status-box success"; });
  $("copyShader").addEventListener("click",async()=>{ try{await navigator.clipboard.writeText(buildShader(state()));status.textContent="Código copiado al portapapeles.";status.className="status-box success";}catch{status.textContent="No se pudo copiar automáticamente. Selecciona el código manualmente.";status.className="status-box error";} });
  $("downloadConfig").addEventListener("click",()=>download("toolhub-shader-config.json",JSON.stringify(state(),null,2),"application/json"));
  $("resetShader").addEventListener("click",()=>{applyState(defaultState);status.textContent="Configuración restablecida.";status.className="status-box";});
  document.querySelectorAll("[data-shader-preset]").forEach(b=>b.addEventListener("click",()=>{applyState({...defaultState,...presets[b.dataset.shaderPreset]});status.textContent=`Preset “${b.textContent.trim()}” aplicado.`;status.className="status-box success";}));
  $("previewPlay").addEventListener("click",()=>{ if(playing){pausedTime=(performance.now()-startTime)/1000;playing=false;$("previewPlay").textContent="▶ Reproducir";}else{startTime=performance.now()-pausedTime*1000;playing=true;$("previewPlay").textContent="⏸ Pausar";requestAnimationFrame(loop);} });
  $("previewReset").addEventListener("click",()=>{startTime=performance.now();pausedTime=0;if(!playing)renderPreview(performance.now());});

  ids.forEach(id=>controls[id]?.addEventListener("input",()=>{syncUi();if(!playing)renderPreview(performance.now());}));
  ids.forEach(id=>controls[id]?.addEventListener("change",()=>{syncUi();if(!playing)renderPreview(performance.now());}));

  syncUi();
  requestAnimationFrame(loop);
})();
