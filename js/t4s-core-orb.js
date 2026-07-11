// T4S Core particle orb (Infracorp-style).
//
// Comportamento:
//   - Su Applied AI il chip nativo viene nascosto e compare la palla
//     particellare a SINISTRA (la sezione "Applied AI" ha la scritta
//     sulla colonna destra → spazio vuoto a sinistra).
//   - Mentre scorri, la palla SCENDE: stesso lato (sinistra), si sposta
//     verso il fondo del viewport.
//   - Su T4S Core la palla è a SINISTRA, mezzo-tagliata sul bordo
//     inferiore (Infracorp half-cut). Lo sfondo della sola sezione T4S
//     Core diventa un dark caldo (più scuro del default ma non nero).
//   - Sulle altre sezioni (Cloud, Data, Security, Stack, ...) niente:
//     overlay invisibile, chip nativo intatto, palla nascosta.

// Three.js ospitato in locale (non più da esm.sh): l'import dalla CDN
// esterna falliva su alcuni browser mobile → lo script orb non partiva,
// quindi il chip restava visibile e la palla non compariva. Self-hosting
// = nessuna dipendenza esterna, l'orb parte ovunque (mobile incluso).
import * as THREE from '/js/three.module.min.js';

const ORB_ID = 't4s-core-orb-canvas';
const OVERLAY_ID = 't4s-core-orb-overlay';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

function init() {
  if (document.getElementById(ORB_ID)) return;

  const tCore = document.getElementById('t4s-core');
  const tApplied = document.getElementById('horizon-ai');
  const tStack = document.getElementById('tech-stack');
  if (!tCore || !tApplied) return setTimeout(init, 200);

  // ── Overlay warm-dark sulla sola T4S Core ─────────────────────────
  // Più scuro del default, NON nero: tono burgundy/wine quasi opaco
  // con leggerissimo radial verso il centro per dare profondità.
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '1', // sopra al canvas nativo (z 0), sotto la palla (z 2) e contenuto (z 10)
    opacity: '0',
    transition: 'opacity 0.25s linear',
    background:
      'radial-gradient(ellipse 120% 95% at 50% 45%, ' +
      'rgba(28, 18, 8, 0.96) 0%, ' +
      'rgba(18, 12, 6, 0.98) 55%, ' +
      'rgba(10, 10, 12, 0.99) 100%)',
  });
  document.body.appendChild(overlay);

  // ── Ambient su Applied AI ─────────────────────────────────────────
  // Quando nascondiamo il chip nativo, la sezione resterebbe solo bg
  // body = visibilmente più scura delle altre. Questo overlay molto
  // leggero (alpha ~0.18) restituisce la stessa "warmth" ambient delle
  // altre sezioni horizon SENZA disegnare nulla — è solo un radial soft.
  const appliedOverlay = document.createElement('div');
  appliedOverlay.id = 't4s-applied-ambient';
  appliedOverlay.setAttribute('aria-hidden', 'true');
  Object.assign(appliedOverlay.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '1',
    opacity: '0',
    transition: 'opacity 0.25s linear',
    background:
      'radial-gradient(ellipse 95% 75% at 55% 50%, ' +
      'rgba(120, 62, 20, 0.22) 0%, ' +
      'rgba(80, 42, 14, 0.14) 45%, ' +
      'rgba(20, 12, 6, 0) 80%)',
  });
  document.body.appendChild(appliedOverlay);


  // ── Canvas nativo (chip / sfera del bundle Next.js) ───────────────
  // Lo nascondiamo solo dove ci interessa: Applied AI (no chip) e T4S
  // Core (sotto al nostro overlay). Sulle altre sezioni resta intatto.
  let bgWrapper = document.querySelector(
    'div[aria-hidden="true"][class*="fixed"][class*="inset-0"][class*="pointer-events-none"][style*="z-index:0"]'
  );
  // Dopo l'hydration di React lo stile inline viene riserializzato come
  // "z-index: 0" (con spazio) e il selettore sopra non matcha più → il chip
  // nativo non veniva nascosto e restava visibile insieme alla palla.
  // Fallback robusto: il wrapper del canvas nativo è l'unico div aria-hidden
  // / pointer-events-none che contiene un <canvas>.
  if (!bgWrapper) {
    document
      .querySelectorAll('div[aria-hidden="true"][class*="pointer-events-none"]')
      .forEach((el) => {
        if (!bgWrapper && el.querySelector('canvas')) bgWrapper = el;
      });
  }
  if (bgWrapper && !bgWrapper.style.transition) {
    bgWrapper.style.transition = 'opacity 0.25s linear';
  }

  function visibilityForRect(rect, vh) {
    if (rect.bottom < 0 || rect.top > vh) return 0;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    // Banda strettissima: overlay/bg-hide a piena intensità solo quando
    // la sezione copre ≥8% del viewport. Fade in/out in pochissimi px di
    // scroll → niente residui visibili sulle sezioni adiacenti.
    return clamp(visible / (vh * 0.08), 0, 1);
  }

  function updateBackground() {
    const vh = window.innerHeight;
    const aFade = visibilityForRect(tApplied.getBoundingClientRect(), vh);
    const cFade = visibilityForRect(tCore.getBoundingClientRect(), vh);
    const sFade = tStack ? visibilityForRect(tStack.getBoundingClientRect(), vh) : 0;
    const maxFade = Math.max(aFade, cFade, sFade);

    // Tema identico su desktop E mobile:
    // - dark warm su T4S Core + Stack (tech-stack)
    // - warmth Applied AI su tutte le altre sezioni (stesso identico colore)
    overlay.style.opacity = String(Math.max(cFade, sFade));
    appliedOverlay.style.opacity = String(1 - Math.max(cFade, sFade));
    if (bgWrapper) {
      // Chip nativo (canvas r3f di sfondo) nascosto su Applied AI + T4S
      // Core: su queste due sezioni vogliamo vedere SOLO la palla
      // particellare, senza il disegno del chip dietro/sovrapposto.
      // Stack e le altre sezioni restano intatte.
      const hideChip = Math.max(aFade, cFade);
      if (hideChip > 0) {
        bgWrapper.style.opacity = String(1 - hideChip);
        // Quando è (quasi) del tutto nascosto — per gran parte di Applied
        // AI / T4S Core e di tutta la discesa — usa visibility:hidden così
        // il compositor non rifonde il canvas WebGL a schermo intero a
        // ogni frame (una delle cause dello scatto in discesa). L'opacità
        // resta solo per il breve fade ai bordi delle sezioni.
        bgWrapper.style.visibility = hideChip > 0.985 ? 'hidden' : '';
      } else {
        bgWrapper.style.removeProperty('opacity');
        bgWrapper.style.visibility = '';
      }
    }
  }
  window.addEventListener('scroll', updateBackground, { passive: true });
  window.addEventListener('resize', updateBackground);
  updateBackground();

  // ── Canvas orb (three.js) ─────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = ORB_ID;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '2',
    opacity: '0',
  });
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });

  // Mezza altezza viewport in world units a z=0 (FOV 38°, z=5).
  const HALF_H = Math.tan((38 * Math.PI) / 360) * 5; // ≈ 1.72

  function resize() {
    // altezza/larghezza STABILI del canvas (bloccate via CSS a 100lvh su
    // mobile): così la barra del browser che appare/scompare durante lo
    // scroll non ridimensiona il canvas → niente "gonfiore".
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 2600;
  const BASE_RADIUS = 1.25; // leggermente più grande del default (era 1.0)
  const positions = new Float32Array(COUNT * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const radius = BASE_RADIUS * (0.96 + Math.random() * 0.08);
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const sprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 22);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,212,170,0.85)');
    g.addColorStop(1, 'rgba(242,146,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const material = new THREE.PointsMaterial({
    size: 0.045,
    sizeAttenuation: true,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffd2a6,
    opacity: 0.95,
  });

  const orb = new THREE.Points(geometry, material);
  scene.add(orb);

  // ── Trajectory ────────────────────────────────────────────────────
  // Su Applied AI: palla a SINISTRA (testo in colonna destra → spazio
  // vuoto a sinistra), centro-verticale.
  // Transizione → T4S Core: scivola in basso E al CENTRO orizzontale.
  // Su T4S Core: CENTRATA orizzontalmente, mezzo-tagliata in basso
  // (Infracorp half-cut classico).
  // Fattore mobile: ridimensiona la palla in base alla larghezza viewport.
  // Su mobile (≤480px) la palla è ~50% più piccola; transizione lineare
  // fino a 1024px dove ritorna a scala 1.0.
  function mobileScale(vw) {
    if (vw >= 1024) return 1.0;
    if (vw <= 480) return 0.5;
    return 0.5 + ((vw - 480) / (1024 - 480)) * 0.5;
  }

  function leftX(vw, vh) {
    // Su viewport stretto (mobile) il layout di Applied AI diventa
    // single-column → niente "spazio vuoto a sinistra" → palla CENTRATA.
    if (vw < 768) return 0;
    const halfW = HALF_H * (vw / vh);
    const desired = -halfW * 0.42;
    const minX = -halfW + 1.3;
    return Math.max(minX, Math.min(-0.4, desired));
  }

  function getTrajectory(coreRect, appliedRect, vw, vh) {
    const xL = leftX(vw, vh);
    const xC = 0; // centro orizzontale per T4S Core

    const mScale = mobileScale(vw);
    // Su mobile l'offset half-cut è proporzionale (ball più piccola
    // → meno offset per restare sul bordo); su desktop tieni i valori.
    const Y_HALFCUT  = -HALF_H - 0.55 * mScale;
    const Y_LOW      = -HALF_H - 0.30 * mScale;
    const Y_MID      = 0.05;
    const Y_TOP_EXIT = HALF_H + 2.5;
    const isMobile = vw < 768;
    // Su MOBILE la palla NON cresce durante la discesa: SCALE_CORE =
    // SCALE_APP. La crescita ("gonfiore") risultava buggata/a scatti sui
    // telefoni → scala costante = niente gonfiore. Su desktop invariata
    // (cresce da 1.0 a 1.3).
    const SCALE_APP  = (isMobile ? 1.2 : 1.0) * mScale;
    const SCALE_CORE = (isMobile ? 1.2 : 1.3) * mScale;

    const ratioCore = coreRect.top / vh;
    const ratioApp  = appliedRect.top / vh;

    // Hard guard: né Applied AI né T4S Core → nascosta
    const appliedInView = appliedRect.bottom > 0 && appliedRect.top < vh;
    const coreInView    = coreRect.bottom > 0 && coreRect.top < vh;
    if (!appliedInView && !coreInView) {
      return { x: xL, y: Y_MID, vis: 0, scale: SCALE_APP };
    }

    // 1) Applied AI ancora sotto → palla nascosta
    if (ratioApp > 0.5) {
      return { x: xL, y: Y_MID, vis: 0, scale: SCALE_APP };
    }

    // 2) Banda fade-in [0.5, 0.3]
    if (ratioApp > 0.3 && ratioCore > 1.0) {
      return {
        x: xL, y: Y_MID,
        vis: smooth((0.5 - ratioApp) / 0.2),
        scale: SCALE_APP,
      };
    }

    // 2b) Applied AI dominante, T4S Core non ancora arrivato
    if (ratioCore > 1.0) {
      return { x: xL, y: Y_MID, vis: 1, scale: SCALE_APP };
    }

    // 3) Transizione Applied → T4S Core (sinistra-centro → centro-bottom)
    if (ratioCore > 0.0) {
      const tRaw = clamp((1.0 - ratioCore) / 1.0, 0, 1);
      const t = smooth(tRaw);
      // Su mobile usa smoothstep anche per la scala: derivata 0 ai bordi
      // → si raccorda allo slope-0 delle zone 2b/4 senza kink. Combinato
      // alla magnitude ridotta (sopra) e al damping più lento (sotto),
      // il gonfiore non ha più punti di "scatto" visibili.
      const tScale = t;
      return {
        x: lerp(xL, xC, t),
        y: lerp(Y_MID, Y_HALFCUT, t),
        vis: 1,
        scale: lerp(SCALE_APP, SCALE_CORE, tScale),
      };
    }

    // 4) T4S Core attivo → half-cut + uscita verso il top
    if (coreRect.bottom <= vh * 0.05) {
      return { x: xC, y: Y_TOP_EXIT, vis: 0, scale: SCALE_CORE };
    }
    const sectionScrollVh = Math.max(coreRect.height / vh, 1);
    const p = clamp(-ratioCore / sectionScrollVh, 0, 1);
    if (p < 0.55) {
      const t = smooth(p / 0.55);
      return { x: xC, y: lerp(Y_HALFCUT, Y_LOW, t), vis: 1, scale: SCALE_CORE };
    }
    const t = smooth((p - 0.55) / 0.45);
    return {
      x: xC,
      y: lerp(Y_LOW, Y_TOP_EXIT, t),
      vis: 1 - t,
      scale: SCALE_CORE,
    };
  }

  const target = { x: leftX(window.innerWidth, window.innerHeight), y: 0, vis: 0, scale: 1.0 };

  function updateTarget() {
    const traj = getTrajectory(
      tCore.getBoundingClientRect(),
      tApplied.getBoundingClientRect(),
      canvas.clientWidth || window.innerWidth,
      canvas.clientHeight || window.innerHeight
    );
    target.x = traj.x;
    target.y = traj.y;
    target.vis = traj.vis;
    target.scale = traj.scale;
  }

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', updateTarget);
  updateTarget();
  orb.position.set(target.x, target.y, 0);
  orb.scale.setScalar(target.scale);

  const clock = new THREE.Clock();
  const POS_DAMP = 8;
  const VIS_DAMP = 14; // più reattivo: il fade-out finisce in pochi frame, niente "ombra"
  let curVis = 0;
  let curScale = target.scale;

  function tick() {
    requestAnimationFrame(tick);
    const dt = clock.getDelta();

    // Aggiorna target ogni frame, non solo sui scroll events: su iOS gli
    // scroll events durante momentum scroll arrivano a scatti irregolari
    // → target.scale saltava di colpo e curScale rincorreva con un pop
    // visibile. Calcolando il target a 60fps dal rect corrente, il target
    // evolve smoothly e curScale lo segue senza scatti. Posizione e scala
    // usano lo stesso damping → si muovono in sincronia, niente "cresce
    // sul posto" da un lato.
    updateTarget();

    const k = 1 - Math.exp(-POS_DAMP * dt);
    orb.position.x += (target.x - orb.position.x) * k;
    orb.position.y += (target.y - orb.position.y) * k;
    curScale += (target.scale - curScale) * k;
    orb.scale.setScalar(curScale);

    // Snap istantaneo a 0 quando target.vis è 0 → niente "ombra"
    // residua durante lo scroll su sezioni dove la palla non deve
    // essere visibile. Negli altri casi mantiene il damping morbido.
    if (target.vis === 0) {
      curVis = 0;
    } else {
      const kv = 1 - Math.exp(-VIS_DAMP * dt);
      curVis += (target.vis - curVis) * kv;
    }
    canvas.style.opacity = curVis.toFixed(3);

    // Salta del tutto il render quando la palla è invisibile e ferma
    // (tutte le sezioni tranne Applied AI / T4S Core): evita un intero
    // pass WebGL a 60fps dove non si vede nulla → meno carico complessivo
    // e scorrimento più fluido durante la discesa.
    if (curVis < 0.002 && target.vis === 0) return;

    orb.rotation.y += dt * 0.16;
    orb.rotation.x += dt * 0.04;
    renderer.render(scene, camera);
  }
  tick();
}

// Avvia dopo il 'load' (con un piccolo ritardo) così l'hydration di React
// è già avvenuta: evita che un eventuale re-render lato client invalidi i
// riferimenti agli elementi (sezioni / canvas nativo) usati dall'orb.
function boot() {
  setTimeout(init, 300);
}
if (document.readyState === 'complete') {
  boot();
} else {
  window.addEventListener('load', boot);
}
