/* ============================================================
   js/gauge.js
   Carbon gauge SVG — arc and needle animate via CSS keyframes.
   More reliable than JS transitions for SVG elements....
   ============================================================ */

function renderGauge(carbon) {
  const container = document.getElementById('gauge-container');
  if (!container) return;

  const carbonVal    = carbon ? parseFloat(carbon.nz_carbon_gkwh          || 0) : 0;
  const renewablePct = carbon ? parseFloat(carbon.renewable_pct           || 0) : 0;
  const monthAvg     = carbon ? parseFloat(carbon.current_month_avg_gkwh  || 0) : 0;
  const yearAvg      = carbon ? parseFloat(carbon.current_year_avg_gkwh   || 0) : 0;
  const statusTxt    = carbon ? (carbon.carbon_status || '')               : '';

  // ── Same math as Streamlit ───────────────────────────────
  const MAX_VAL = CONFIG.GAUGE_VALUE_MAX;

  const gaugeProgress = Math.min(Math.max(carbonVal / MAX_VAL, 0), 1);
  const needleAngle = Math.round((-90 + gaugeProgress * 180) * 10) / 10;

  // ── Tick marks ───────────────────────────────────────────
  let ticks = '';
  for (let i = 0; i <= 10; i++) {
    const angle = -90 + i * 18;
    const delay = (i * 0.1).toFixed(1);
    ticks += `<line x1="200" y1="68" x2="200" y2="84"
      stroke="#1e3448" stroke-width="2" stroke-linecap="round"
      transform="rotate(${angle} 200 230)"
      style="animation:tickPulse 2s ease ${delay}s infinite"/>`;
  }

  // ── Inject unique keyframe names so each page load is fresh
  // Using a timestamp prevents stale cached animations
  const uid = Date.now();

  container.innerHTML = `
    <style>
      /* Needle: from -90deg (position 0) → actual angle */
      @keyframes needleSpin_${uid} {
        from { transform: rotate(-90deg); }
        to   { transform: rotate(${needleAngle}deg); }
      }

      .gauge-needle-${uid} {
        transform-origin: 200px 230px;
        transform-box: view-box;
        transform: rotate(-90deg);
        animation: needleSpin_${uid} 1.35s cubic-bezier(0.34,1.56,0.64,1) 0.45s forwards;
      }
      
      @keyframes zoneFadeIn_${uid} {
        from {
          opacity: 0;
          filter: brightness(0.75);
        }
        to {
          opacity: 0.95;
          filter: brightness(1);
        }
      }

      .gauge-zone-${uid} {
        opacity: 0;
        animation: zoneFadeIn_${uid} 0.75s ease-out forwards;
      }

      .gauge-zone-green-${uid} {
        animation-delay: 0.10s;
      }

      .gauge-zone-orange-${uid} {
        animation-delay: 0.22s;
      }

      .gauge-zone-red-${uid} {
        animation-delay: 0.34s;
      }

      /* Stats row items slide up */
      @keyframes statUp_${uid} {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes metricPop_${uid} {
        from {
          opacity: 0;
          transform: translateY(6px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .gauge-metric-${uid} {
        transform-box: fill-box;
        transform-origin: center;
        animation: metricPop_${uid} 0.55s ease-out 0.25s both;
      }


      .gauge-stat-${uid}:nth-child(1) {
        animation: statUp_${uid} 0.5s ease 1.2s both;
      }
      .gauge-stat-${uid}:nth-child(2) {
        animation: statUp_${uid} 0.5s ease 1.4s both;
      }
      .gauge-stat-${uid}:nth-child(3) {
        animation: statUp_${uid} 0.5s ease 1.6s both;
      }
    </style>

    <div class="gauge-wrap">
      <svg viewBox="0 0 400 250" class="gauge-svg">
        <defs>
          <filter id="needleGlow_${uid}">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- Value + status -->
        <g class="gauge-metric-${uid}">
          <text x="200" y="0" text-anchor="middle"
            font-size="11" font-weight="700" fill="#6ee7b7"
            font-family="Space Mono,monospace">${statusTxt}</text>

          <text x="200" y="22" text-anchor="middle"
            font-size="20" font-weight="700" fill="white"
            font-family="Space Mono,monospace"
            id="gauge-num">0.0</text>

          <text x="200" y="42" text-anchor="middle"
            font-size="10" fill="#7a9bb5"
            font-family="Space Mono,monospace">g/kWh</text>
        </g>

        <!-- Track -->
        <path d="M 32 230 A 168 168 0 0 1 368 230"
          fill="none" stroke="#1e3448"
          stroke-width="22" stroke-linecap="round"/>

        <!-- Carbon zones: 0–50 low, 50–100 medium, 100–150 high -->
        <path
          class="gauge-zone-${uid} gauge-zone-green-${uid}"
          d="M 32 230 A 168 168 0 0 1 116 84.5"
          fill="none"
          stroke="#10b981"
          stroke-width="22"
          stroke-linecap="round"
          opacity="0.95"/>

        <path
          class="gauge-zone-${uid} gauge-zone-orange-${uid}"
          d="M 116 84.5 A 168 168 0 0 1 284 84.5"
          fill="none"
          stroke="#f59e0b"
          stroke-width="22"
          stroke-linecap="butt"
          opacity="0.95"/>

        <path
          class="gauge-zone-${uid} gauge-zone-red-${uid}"
          d="M 284 84.5 A 168 168 0 0 1 368 230"
          fill="none"
          stroke="#ef4444"
          stroke-width="22"
          stroke-linecap="butt"
          opacity="0.95"/>
        
        <!-- Round cap only at the far right end -->
        <circle
          class="gauge-zone-${uid} gauge-zone-red-${uid}"
          cx="368"
          cy="230"
          r="11"
          fill="#ef4444"
          opacity="0.95"/>

        <!-- Ticks -->
        ${ticks}

        <!-- Labels -->
        <text x="60"  y="235" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">0</text>
        <text x="116" y="120" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">50</text>
        <text x="284" y="120" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">100</text>
        <text x="340" y="235" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">150</text>

        <!-- Needle — CSS keyframe drives the spin -->
        <g class="gauge-needle-${uid}">
          <line x1="200" y1="238" x2="200" y2="98"
            stroke="rgba(45,212,191,0.22)" stroke-width="5"
            stroke-linecap="round"/>
          <line x1="200" y1="238" x2="200" y2="98"
            stroke="#2dd4bf" stroke-width="3"
            stroke-linecap="round"
            filter="url(#needleGlow_${uid})"/>
          <circle cx="200" cy="230" r="12"
            fill="#111d2e" stroke="#2dd4bf" stroke-width="2.5"/>
          <circle cx="200" cy="230" r="5" fill="#2dd4bf"/>
        </g>
      </svg>

      <!-- Stats row -->
      <div class="gauge-stats">
        <div class="gauge-stat-item gauge-stat-${uid}">
          <div class="gauge-stat-value">${yearAvg.toFixed(0)} g/kWh</div>
          <div class="gauge-stat-label">2026 AVERAGE</div>
        </div>
        <div class="gauge-stat-item gauge-stat-mid gauge-stat-${uid}">
          <div class="gauge-stat-value">${monthAvg.toFixed(0)} g/kWh</div>
          <div class="gauge-stat-label">MAY AVERAGE</div>
        </div>
        <div class="gauge-stat-item gauge-stat-${uid}">
          <div class="gauge-stat-value gauge-stat-green">
            ${renewablePct.toFixed(0)}%
          </div>
          <div class="gauge-stat-label">RENEWABLE</div>
        </div>
      </div>
    </div>`
    const numberEl = container.querySelector("#gauge-num");
    animateGaugeNumber(numberEl, carbonVal, 1600, 300);
}

function animateGaugeNumber(el, target, duration = 1600, delay = 300) {
  if (!el) return;

  el.textContent = "0.0";

  const startTime = performance.now() + delay;

  function tick(now) {
    if (now < startTime) {
      requestAnimationFrame(tick);
      return;
    }

    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    el.textContent = (target * ease).toFixed(1);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = target.toFixed(1);
    }
  }

  requestAnimationFrame(tick);
}