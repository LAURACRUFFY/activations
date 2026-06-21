/* ═══════════════════════════════════════════════
   CRUFFY — Try & Guess
   app.js
   ─────────────────────────────────────────────
   Secciones:
   1. Config desde URL params
   2. Navegación entre steps
   3. Formulario
   4. Guess (elección de sabor)
   5. Ticket y resultado
   6. Countdown
   7. Sesión persistida
   8. Init
   ═══════════════════════════════════════════════ */


/* ─── 1. Config desde URL params ──────────────
   Todas las variables editables están aquí arriba.
   Se inyectan vía query string para reutilizar la
   misma página en distintas activaciones.

   Ejemplo de URL:
   ?evento=2lr&code=CRUFFY2LR&partner=2LR Club&flavor=mango&sheet=https://script.google.com/...
   ─────────────────────────────────────────────── */

const P       = new URLSearchParams(location.search);
const EVENTO  = P.get('evento')  || 'hacienda-garden-edit';
const CODE    = P.get('code')    || 'CRUFFYHACIENDA';
const PARTNER = P.get('partner') || 'Hacienda';
const GAS_URL = P.get('sheet')   || 'https://script.google.com/macros/s/AKfycbwEWvXXhW_0uQlVgCQN0UkYahNBllE_Pt_gF7IHoXzaF51yyN09XLzLVDUNPa7SdHRMNg/exec';

/* ─── Cruffy backend integration ───────────────
   El cupón (winner/loser) y los leads salen de la
   API de Cruffy (única fuente de verdad). El CTA
   lleva al checkout con el bundle + cupón aplicado.
   Todo override-able por query string. */
const CRUFFY_API = (P.get('api')    || 'https://cruffyfoods-production.up.railway.app').replace(/\/+$/, '');
const STORE      = (P.get('store')  || 'https://cruffyfoods.onrender.com').replace(/\/+$/, '');
const BUNDLE     =  P.get('bundle') || 'bundle-12-mix';

/* Lead capturado, para enriquecerlo luego con el resultado/cupón. */
let CURRENT_LEAD = null;

function postLeadToCruffy(lead) {
  if (!CRUFFY_API) return;
  fetch(CRUFFY_API + '/api/v1/activations/lead', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(lead),
  }).catch(() => {});
}

/* Pon 'mango' o 'pina' para modo estricto.
   Vacío ('') = todos aciertan — bueno para activaciones
   donde el objetivo es generar leads, no filtrar. */
const FLAVOR  = P.get('flavor')  || '';

/* Mes y año mostrado en el ticket.
   Formato libre: "Junio 2026", "Milano · Jun 26", etc. */
const FECHA   = P.get('fecha')   || 'Giugno 2026';


/* ─── Prize pool ────────────────────────────────
   Distribuisce i premi tra ~55 partecipanti.
   I contatori vengono salvati in localStorage.
   ─────────────────────────────────────────────── */
const PRIZE_POOL = [
  {
    id:    'pack',
    icon:  '🎁',
    title: 'Pack di Cruffy gratis',
    desc:  'Ritiralo subito da noi — è tuo.',
    count: 10,
  },
  {
    id:    'drink',
    icon:  '🍹',
    title: 'Un drink gratis',
    desc:  'Offerto dagli amici di Hacienda. Salute!',
    count: 40,
  },
];

function getPrize() {
  const key = 'cruffy_prizes_' + EVENTO;
  let remaining;
  try {
    remaining = JSON.parse(localStorage.getItem(key) || 'null');
  } catch (_) { remaining = null; }

  if (!remaining) {
    remaining = {};
    PRIZE_POOL.forEach(p => { remaining[p.id] = p.count; });
  }

  /* Lista ponderada de premios disponibles */
  const available = [];
  PRIZE_POOL.forEach(p => {
    const n = Math.max(0, remaining[p.id] || 0);
    for (let i = 0; i < n; i++) available.push(p.id);
  });

  const pickedId = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : PRIZE_POOL[0].id; /* fallback si se agotan todos */

  remaining[pickedId] = Math.max(0, (remaining[pickedId] || 0) - 1);
  try { localStorage.setItem(key, JSON.stringify(remaining)); } catch (_) {}

  return PRIZE_POOL.find(p => p.id === pickedId);
}


/* ─── 2. Navegación entre steps ───────────────── */

function goTo(stepId) {
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('active');
    s.setAttribute('aria-hidden', 'true');
  });

  const target = document.getElementById('step-' + stepId);
  if (!target) return;

  target.classList.add('active');
  target.removeAttribute('aria-hidden');
  window.scrollTo(0, 0);

  /* Mueve el foco al primer heading del step para lectores de pantalla */
  const heading = target.querySelector('h1, h2, [role="status"]');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}


/* ─── 3. Formulario ───────────────────────────── */

function submitForm() {
  const nombre   = (document.getElementById('f-nombre').value   || '').trim();
  const whatsapp = (document.getElementById('f-whatsapp').value || '').trim();
  const email    = (document.getElementById('f-email').value    || '').trim();
  const zona     = (document.getElementById('f-zona').value     || '').trim();
  const alertEl  = document.getElementById('form-alert');

  if (!nombre || (!whatsapp && !email)) {
    alertEl.classList.add('visible');
    /* Foco en el campo vacío relevante para accesibilidad */
    if (!nombre) {
      document.getElementById('f-nombre').focus();
    } else {
      document.getElementById('f-whatsapp').focus();
    }
    return;
  }

  alertEl.classList.remove('visible');

  const lead = {
    nombre,
    whatsapp,
    email,
    zona,
    canal:  whatsapp ? 'whatsapp' : 'email',
    evento: EVENTO,
    ts:     new Date().toISOString(),
  };

  /* Guarda localmente como respaldo */
  try {
    localStorage.setItem('cruffy_lead_' + Date.now(), JSON.stringify(lead));
  } catch (_) {}

  /* Lead → CRM de Cruffy (fuente de verdad). */
  CURRENT_LEAD = { name: nombre, whatsapp, email, zone: zona, event: EVENTO };
  postLeadToCruffy(CURRENT_LEAD);

  /* Respaldo opcional a Google Apps Script (legacy, no bloquea la UI). */
  if (GAS_URL) {
    fetch(GAS_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(lead),
    }).catch(() => {});
  }

  goTo(2);
}


/* ─── 4. Guess (elección de sabor) ───────────── */

let GAME_WON = false;

function guess(flavor) {
  goTo('2b');

  setTimeout(() => {
    const correct = FLAVOR === '' || flavor === FLAVOR;
    GAME_WON = correct; /* winner = mayor %, loser = menor % */
    buildResult(correct, flavor);
    goTo(3);
  }, 1100);
}


/* ─── 5. Resultado (step 3) ───────────────────── */

function buildResult(correct, flavorChosen) {
  const badge = document.getElementById('result-badge');
  const icon  = document.getElementById('r-icon');
  const title = document.getElementById('r-title');
  const sub   = document.getElementById('r-sub');

  if (correct) {
    badge.className   = 'result-badge correct pop-in';
    icon.textContent  = '🏆';
    title.textContent = 'Palato da esperto!';
    sub.textContent   = 'Non tutti lo indovinano al primo tentativo. Sei dei nostri.';
  } else {
    badge.className   = 'result-badge wrong pop-in';
    icon.textContent  = '🎯';
    const altroSapore = flavorChosen === 'mango' ? 'Ananas' : 'Mango';
    title.textContent = 'Era ' + altroSapore;
    sub.textContent   = 'A volte inganna. Ora lo sai — vai avanti per il premio.';
  }
}


/* ─── 6. Premio (step 4) ──────────────────────── */

function buildPrize(prize, coupon) {
  document.getElementById('prize-icon').textContent  = prize.icon;
  document.getElementById('prize-title').textContent = prize.title;
  document.getElementById('prize-desc').textContent  = prize.desc;

  /* Cupón desde la API de Cruffy (winner/loser); si falla, usa el code de la URL. */
  const code = (coupon && coupon.code) || CODE;
  const pct  = coupon && coupon.type === 'percent'
    ? coupon.value + '% OFF su cruffyfoods.com'
    : '12% OFF su cruffyfoods.com';

  document.getElementById('ticket-code').textContent  = code;
  document.getElementById('ticket-pct').textContent   = pct;
  document.getElementById('ticket-event').textContent = PARTNER + ' · ' + FECHA;

  /* CTA → checkout con el bundle 12-mix + cupón aplicado automáticamente. */
  document.getElementById('btn-shop').href =
    STORE + '/cart/?add=' + encodeURIComponent(BUNDLE) + '&coupon=' + encodeURIComponent(code);

  /* Enriquece el lead con el resultado y el cupón entregado. */
  postLeadToCruffy(Object.assign({}, CURRENT_LEAD || {}, {
    outcome:    GAME_WON ? 'winner' : 'loser',
    couponCode: code,
  }));

  /* Countdown 7 días desde ahora */
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem('cruffy_exp_' + EVENTO, String(expiry));
  } catch (_) {}

  runCountdown(expiry);
}


/* ─── 7. Countdown ────────────────────────────── */

function runCountdown(expiry) {
  let intervalId;

  function tick() {
    const diff = Math.max(0, expiry - Date.now());

    document.getElementById('cd-d').textContent =
      String(Math.floor(diff / 86400000)).padStart(2, '0');
    document.getElementById('cd-h').textContent =
      String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
    document.getElementById('cd-m').textContent =
      String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');

    if (diff === 0) clearInterval(intervalId);
  }

  tick();
  intervalId = setInterval(tick, 15000);
}


/* ─── 8. Sesión persistida ────────────────────
   Con el nuevo flujo de premios cada persona debe
   completar el recorrido completo, así que no
   restauramos sesiones anteriores.
   ─────────────────────────────────────────────── */

function restoreSession() {
  return false;
}


/* ─── 9. Init ────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* Partner badge (legacy, mantenido por compatibilidad) */
  const badge = document.getElementById('partner-badge');
  if (badge && PARTNER) badge.textContent = 'x ' + PARTNER;

  /* Botón inicio */
  document.getElementById('btn-start').addEventListener('click', () => goTo(1));

  /* Submit del formulario */
  document.getElementById('lead-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm();
  });

  /* Enter en cualquier campo dispara submit */
  ['f-zona', 'f-email', 'f-whatsapp', 'f-nombre'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') submitForm();
    });
  });

  /* Botones de sabor */
  document.querySelectorAll('.flavor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      guess(btn.dataset.flavor);
    });
  });

  /* Botón de desbloqueo (solo equipo Cruffy) — step 3 → step 4.
     Pide el cupón a la API según el resultado (winner/loser). */
  document.getElementById('btn-unlock').addEventListener('click', async () => {
    const prize = getPrize();
    const outcome = GAME_WON ? 'winner' : 'loser';
    let coupon = null;
    try {
      const res = await fetch(CRUFFY_API + '/api/v1/activations/coupon?outcome=' + outcome);
      if (res.ok) coupon = await res.json();
    } catch (_) { /* fallback al code de la URL */ }
    buildPrize(prize, coupon);
    goTo(4);
  });

  /* Restaurar sesión previa si existe */
  restoreSession();
});
