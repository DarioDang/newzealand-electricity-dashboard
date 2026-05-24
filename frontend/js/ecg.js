/* ============================================================
   js/ecg.js
   ECG heartbeat — strictly one card at a time, in order.
   Card 1 → pause → Card 2 → pause → Card 3 → Card 4 → repeat.
   Low opacity so it acts as a background effect only.
   ============================================================ */

let ecgResizeBound = false;
let ecgResizeTimer = null;

function initECG() {
  const cards = document.querySelectorAll('.kpi-card');
  if (!cards.length) return;

  // Hide old flow lines
  document.querySelectorAll('.kpi-flow-line').forEach(el => {
    el.style.display = 'none';
  });

  // Clean up previous SVGs
  document.querySelectorAll('.ecg-card-svg').forEach(el => el.remove());

  // ── Timing ───────────────────────────────────────────────
  const SWEEP_DUR = 2000;      
  const HANDOFF_AT = 0.91;     
  const STEP_DUR = SWEEP_DUR * HANDOFF_AT;
  const END_PAUSE = 1200;      

  const TOTAL_CYCLE = STEP_DUR * (cards.length - 1) + SWEEP_DUR + END_PAUSE;

  const cardStarts = [];
  for (let i = 0; i < cards.length; i++) {
    cardStarts.push(i * STEP_DUR);
  }

  // ── ECG path builder ─────────────────────────────────────
  function buildPath(W, H, variant = 0) {
    const midY = H * 0.52;

    const patterns = [
      {
        spike: 0.30,
        qDip: 0.03,
        sDip: 0.12,
        pWave: 0.04,
        tWave: 0.06,
        shift: 0.00,
      },
      {
        spike: 0.24,
        qDip: 0.04,
        sDip: 0.09,
        pWave: 0.03,
        tWave: 0.08,
        shift: -0.02,
      },
      {
        spike: 0.34,
        qDip: 0.025,
        sDip: 0.14,
        pWave: 0.05,
        tWave: 0.05,
        shift: 0.015,
      },
      {
        spike: 0.27,
        qDip: 0.035,
        sDip: 0.10,
        pWave: 0.035,
        tWave: 0.075,
        shift: 0.025,
      },
    ];

    const p = patterns[variant % patterns.length];

    const pts = [
      [0, midY],
      [W * 0.16, midY],
      [W * (0.24 + p.shift), midY - H * p.pWave],
      [W * 0.30, midY],
      [W * 0.35, midY + H * p.qDip],
      [W * (0.41 + p.shift), midY - H * p.spike],
      [W * 0.46, midY + H * p.sDip],
      [W * 0.52, midY],
      [W * 0.60, midY - H * p.tWave],
      [W * 0.70, midY],
      [W, midY],
    ];

    return 'M ' + pts
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' L ');
  }

  // ── Create one SVG per card ───────────────────────────────
  const pathEls = [];
  const dotEls  = [];

  cards.forEach((card, idx) => {
    card.style.position = 'relative';

    const W = card.offsetWidth  || 200;
    const H = card.offsetHeight || 140;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ecg-card-svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    `;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', buildPath(W, H, idx));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#14b8a6');
    path.setAttribute('stroke-width', '1.2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.style.opacity = '0';

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '2.5');
    dot.setAttribute('fill', '#14b8a6');
    dot.style.cssText = `
      filter: drop-shadow(0 0 4px #14b8a6);
      opacity: 0;
    `;

    svg.appendChild(path);
    svg.appendChild(dot);
    card.insertBefore(svg, card.firstChild);

    const len = path.getTotalLength();
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = len;

    pathEls.push({ path, dot, len });
  });

  // ── Single shared rAF loop ────────────────────────────────
  // All cards driven from one timer so they're perfectly in sync.

  function easeInOut(t) {
    return 1 - Math.pow(1 - t, 1.4);
  }

  // MAX opacity — low enough to be background, visible enough to see
  const MAX_OPACITY = 0.20;

  let epochStart = null;

  function loop(ts) {
    if (!epochStart) epochStart = ts;

    const elapsed = (ts - epochStart) % TOTAL_CYCLE;

    pathEls.forEach(({ path, dot, len }, idx) => {
      const cs = cardStarts[idx];           // when this card starts
      const ce = cs + SWEEP_DUR;            // when this card ends

      // Is this card currently active?
      if (elapsed < cs || elapsed >= ce) {
        // Not active — fully hide and reset
        path.style.opacity = '0';
        dot.style.opacity  = '0';
        path.style.strokeDashoffset = len;
        return;
      }

      // Active — compute progress 0→1 within this card's window
      const rawT  = (elapsed - cs) / SWEEP_DUR;
      const cardSpeedShape = 1 + idx * 0.035;
      const drawT = easeInOut(Math.min(Math.pow(rawT, cardSpeedShape), 1));

      // Draw line left to right
      path.style.strokeDashoffset = len * (1 - drawT);

      // Opacity: fade in first 10%, hold, fade out last 18%
      let opacity = 1;

      // fade in rất nhanh để giống ECG vừa chạm card là sáng lên
      if (rawT < 0.08) {
        opacity = rawT / 0.08;
      }

      // fade out nhẹ ở đoạn cuối, đúng lúc card sau nhận chuyển tiếp
      if (rawT > 0.88) {
        opacity = 1 - (rawT - 0.88) / 0.12;
      }

      const cardOpacityBoost = 1 + (idx % 3) * 0.08;
      const finalOp =
        Math.max(0, Math.min(1, opacity)) *
        MAX_OPACITY *
        cardOpacityBoost;

      path.style.opacity = finalOp;

      // Move glow dot to tip
      try {
        const pt = path.getPointAtLength(len * drawT);
        dot.setAttribute('cx', pt.x);
        dot.setAttribute('cy', pt.y);
        // Dot slightly brighter than line but still subtle
        dot.style.opacity = finalOp > 0.01 ? Math.min(finalOp * 3.2, 0.65) : '0';
      } catch (_) {}
    });

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Rebuild on resize
  if (!ecgResizeBound) {
    ecgResizeBound = true;

    window.addEventListener('resize', () => {
      clearTimeout(ecgResizeTimer);
      ecgResizeTimer = setTimeout(initECG, 600);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const startECG = () => {
    initECG();
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(startECG, { timeout: 8000 });
  } else {
    setTimeout(startECG, 6000);
  }
});