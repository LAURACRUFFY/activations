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
const EVENTO  = P.get('evento')  || 'sph-milano';
const CODE    = P.get('code')    || 'CRUFFYSPH';
const PARTNER = P.get('partner') || 'SPH Milano';
const GAS_URL = P.get('sheet')   || 'https://script.google.com/macros/s/AKfycbwEWvXXhW_0uQlVgCQN0UkYahNBllE_Pt_gF7IHoXzaF51yyN09XLzLVDUNPa7SdHRMNg/exec';

/* Pon 'mango' o 'pina' para modo estricto.
   Vacío ('') = todos aciertan — bueno para activaciones
   donde el objetivo es generar leads, no filtrar. */
const FLAVOR  = P.get('flavor')  || '';

/* Mes y año mostrado en el ticket.
   Formato libre: "Junio 2026", "Milano · Jun 26", etc. */
const FECHA   = P.get('fecha')   || 'Giugno 2026';


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

  /* Envía a Google Apps Script sin bloquear la UI */
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

function guess(flavor) {
  goTo('2b');

  setTimeout(() => {
    const correct = FLAVOR === '' || flavor === FLAVOR;
    buildTicket(correct, flavor);
    goTo(3);
  }, 1100);
}


/* ─── 5. Ticket y resultado ───────────────────── */

function buildTicket(correct, flavorChosen) {
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
    badge.className = 'result-badge wrong pop-in';
    icon.textContent = '🎯';
    const altroSapore = flavorChosen === 'mango' ? 'Ananas' : 'Mango';
    title.textContent = 'Era ' + altroSapore;
    sub.textContent   = 'A volte inganna. Ora lo sai — e hai anche il codice.';
  }

  const descuento = correct ? '12%' : '8%';
  document.getElementById('ticket-code').textContent  = CODE;
  document.getElementById('ticket-pct').textContent   = descuento + ' OFF su cruffyfoods.com';
  document.getElementById('ticket-event').textContent = PARTNER + ' · ' + FECHA;

  /* Countdown 7 días desde ahora */
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem('cruffy_exp_' + EVENTO, String(expiry));
  } catch (_) {}

  runCountdown(expiry);
}


/* ─── 6. Countdown ────────────────────────────── */

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


/* ─── 7. Sesión persistida ────────────────────
   Si el usuario ya jugó y su código sigue vigente,
   se salta directo al resultado guardado.
   ─────────────────────────────────────────────── */

function restoreSession() {
  try {
    const exp = parseInt(localStorage.getItem('cruffy_exp_' + EVENTO) || '0', 10);
    if (exp > Date.now()) {
      buildTicket(true, 'mango');
      goTo(3);
      return true;
    }
  } catch (_) {}
  return false;
}


/* ─── 8. Init ────────────────────────────────── */

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

  /* Restaurar sesión previa si existe */
  restoreSession();
});
