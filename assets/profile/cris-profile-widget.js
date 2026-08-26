(() => {
  'use strict';
  if (document.getElementById('crisProfileOrb')) return;

  const config = {
    iconSrc: 'assets/profile/cris-profile-icon.webp',
    cardSrc: 'assets/profile/tarjeta-cris.html?v=cris-layers-4',
    iconSize: 86,
    edge: 20,
    maxTilt: 4.2,
    maxShift: 2.2
  };

  const style = document.createElement('style');
  style.id = 'crisProfileWidgetStyles';
  style.textContent = `
    :root { --cris-orb-size:${config.iconSize}px; --cris-orb-edge:${config.edge}px; }

    .cris-profile-orb {
      --tilt-x:0deg; --tilt-y:0deg; --shift-x:0px; --shift-y:0px;
      position:fixed; right:var(--cris-orb-edge); bottom:var(--cris-orb-edge);
      z-index:9800; width:var(--cris-orb-size); height:var(--cris-orb-size);
      padding:0; border:0; background:transparent; cursor:pointer;
      perspective:760px; isolation:isolate; -webkit-tap-highlight-color:transparent;
      filter:drop-shadow(0 10px 18px rgba(0,0,0,.48)) drop-shadow(0 0 9px rgba(255,255,255,.08));
      transition:filter .24s ease,opacity .22s ease;
    }
    .cris-profile-orb::after {
      content:''; position:absolute; inset:3px; border-radius:50%; pointer-events:none;
      background:linear-gradient(112deg,transparent 8%,rgba(255,255,255,0) 33%,rgba(255,255,255,.52) 46%,rgba(255,255,255,.12) 53%,transparent 66%);
      mix-blend-mode:screen; opacity:.20; transform:translateX(-48%) rotate(-7deg);
      animation:crisMetalSweep 5.8s ease-in-out infinite;
    }
    .cris-profile-orb__image {
      display:block; width:100%; height:100%; object-fit:contain;
      transform:translate3d(var(--shift-x),var(--shift-y),0) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
      transform-style:preserve-3d; will-change:transform; transition:transform 110ms linear;
      user-select:none; pointer-events:none;
    }
    .cris-profile-orb:hover { filter:drop-shadow(0 13px 21px rgba(0,0,0,.52)) drop-shadow(0 0 12px rgba(255,255,255,.11)); }
    .cris-profile-orb:focus-visible { outline:2px solid rgba(255,255,255,.72); outline-offset:5px; }
    @keyframes crisMetalSweep {
      0%,68%,100% { transform:translateX(-58%) rotate(-7deg); opacity:.08; }
      78% { opacity:.32; }
      88% { transform:translateX(58%) rotate(-7deg); opacity:.11; }
    }

    .cris-profile-modal {
      position:fixed; inset:0; z-index:12000; display:grid; place-items:center;
      padding:clamp(18px,3.5vw,54px); opacity:0; visibility:hidden; pointer-events:none;
      background:rgba(3,6,12,0); -webkit-backdrop-filter:blur(0) brightness(1) saturate(1);
      backdrop-filter:blur(0) brightness(1) saturate(1);
      transition:opacity .28s ease,visibility .28s ease,backdrop-filter .34s ease,-webkit-backdrop-filter .34s ease,background .34s ease;
    }
    .cris-profile-modal.is-open {
      opacity:1; visibility:visible; pointer-events:auto; background:rgba(3,6,12,.34);
      -webkit-backdrop-filter:blur(9px) brightness(.68) saturate(.88);
      backdrop-filter:blur(9px) brightness(.68) saturate(.88);
    }
    .cris-profile-modal__shell {
      position:relative; width:min(1220px,92vw); aspect-ratio:3/2; max-height:86vh;
      overflow:visible; background:transparent; border:0; border-radius:28px;
      transform:translateY(15px) scale(.965); opacity:.2;
      filter:drop-shadow(0 30px 54px rgba(0,0,0,.48));
      transition:transform .34s cubic-bezier(.2,.75,.2,1),opacity .30s ease;
    }
    .cris-profile-modal.is-open .cris-profile-modal__shell { transform:none; opacity:1; }
    .cris-profile-modal__frame {
      display:block; width:100%; height:100%; border:0; border-radius:28px;
      background:transparent; overflow:hidden; box-shadow:none;
    }
    .cris-profile-modal__close {
      position:absolute; top:10px; right:10px; z-index:3;
      width:38px; height:38px; display:grid; place-items:center; padding:0;
      border-radius:50%; border:1px solid rgba(255,255,255,.16);
      background:rgba(5,9,15,.62); color:#fff; font:400 25px/1 system-ui,sans-serif;
      cursor:pointer; box-shadow:0 8px 22px rgba(0,0,0,.28);
      -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px);
      transition:background .2s ease,transform .2s ease;
    }
    .cris-profile-modal__close:hover { background:rgba(10,15,24,.88); transform:scale(1.05); }
    body.cris-profile-modal-open { overflow:hidden !important; }
    body.cris-profile-modal-open .cris-profile-orb { opacity:0; pointer-events:none; }

    @media (max-width:720px) {
      :root { --cris-orb-size:72px; --cris-orb-edge:14px; }
      .cris-profile-modal { padding:12px; }
      .cris-profile-modal__shell { width:96vw; max-height:78vh; }
      .cris-profile-modal__close { top:8px; right:8px; width:36px; height:36px; font-size:22px; }
    }
    @media (prefers-reduced-motion:reduce) {
      .cris-profile-orb::after { animation:none; }
      .cris-profile-orb__image,.cris-profile-modal,.cris-profile-modal__shell,.cris-profile-modal__close { transition-duration:.01ms!important; }
    }
  `;
  document.head.appendChild(style);

  const orb=document.createElement('button');
  orb.type='button'; orb.id='crisProfileOrb'; orb.className='cris-profile-orb';
  orb.setAttribute('aria-label','Abrir tarjeta de Cris'); orb.setAttribute('aria-haspopup','dialog');
  orb.innerHTML=`<img class="cris-profile-orb__image" src="${config.iconSrc}" alt="" draggable="false">`;

  const modal=document.createElement('div');
  modal.id='crisProfileModal'; modal.className='cris-profile-modal';
  modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','Tarjeta de Cris'); modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`
    <div class="cris-profile-modal__shell" role="document">
      <iframe class="cris-profile-modal__frame" title="Tarjeta de Cris" loading="lazy" data-src="${config.cardSrc}"></iframe>
      <button class="cris-profile-modal__close" type="button" aria-label="Cerrar tarjeta">×</button>
    </div>`;
  document.body.append(orb,modal);

  const frame=modal.querySelector('.cris-profile-modal__frame');
  const closeButton=modal.querySelector('.cris-profile-modal__close');
  let lastFocused=null;
  const neutral=()=>{
    orb.style.setProperty('--tilt-x','0deg'); orb.style.setProperty('--tilt-y','0deg');
    orb.style.setProperty('--shift-x','0px'); orb.style.setProperty('--shift-y','0px');
  };
  const follow=(event)=>{
    if(modal.classList.contains('is-open')) return;
    const r=orb.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    const nx=Math.max(-1,Math.min(1,(event.clientX-cx)/(innerWidth*.46)));
    const ny=Math.max(-1,Math.min(1,(event.clientY-cy)/(innerHeight*.46)));
    orb.style.setProperty('--tilt-x',`${(-ny*config.maxTilt).toFixed(2)}deg`);
    orb.style.setProperty('--tilt-y',`${(nx*config.maxTilt).toFixed(2)}deg`);
    orb.style.setProperty('--shift-x',`${(nx*config.maxShift).toFixed(2)}px`);
    orb.style.setProperty('--shift-y',`${(ny*config.maxShift).toFixed(2)}px`);
  };
  const open=()=>{
    lastFocused=document.activeElement;
    if(!frame.src) frame.src=frame.dataset.src;
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false');
    document.body.classList.add('cris-profile-modal-open'); neutral();
    requestAnimationFrame(()=>closeButton.focus({preventScroll:true}));
  };
  const close=()=>{
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('cris-profile-modal-open');
    if(lastFocused&&typeof lastFocused.focus==='function') lastFocused.focus({preventScroll:true});
  };
  window.addEventListener('pointermove',follow,{passive:true});
  window.addEventListener('blur',neutral);
  orb.addEventListener('click',open);
  closeButton.addEventListener('click',close);
  document.addEventListener('keydown',(event)=>{
    if(event.key==='Escape'&&modal.classList.contains('is-open')) close();
  });
})();
