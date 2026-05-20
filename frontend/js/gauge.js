/* ============================================================
   js/gauge.js
   Carbon gauge SVG — arc and needle animate via CSS keyframes.
   More reliable than JS transitions for SVG elements.
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
  const ARC_LEN     = CONFIG.GAUGE_ARC_LENGTH;    // 527.8
  const SCALE       = CONFIG.GAUGE_VISUAL_SCALE;  // 0.54
  const MAX_VAL     = CONFIG.GAUGE_VALUE_MAX;      // 150

  let rawProgress   = Math.min(Math.max(carbonVal / MAX_VAL, 0), 1);
  const gaugeProgress = rawProgress * SCALE;
  const arcOffset     = Math.round((ARC_LEN * (1 - gaugeProgress)) * 10) / 10;
  const needleAngle   = Math.round((-90 + gaugeProgress * 180) * 10) / 10;

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
      /* Arc fill: from empty (527.8) → actual offset */
      @keyframes arcFill_${uid} {
        from { stroke-dashoffset: ${ARC_LEN}; }
        to   { stroke-dashoffset: ${arcOffset}; }
      }

      /* Needle: from -90deg (position 0) → actual angle */
      @keyframes needleSpin_${uid} {
        from { transform: rotate(-90deg); }
        to   { transform: rotate(${needleAngle}deg); }
      }

      /* Shimmer sweep */
      @keyframes shimmerSweep_${uid} {
        0%   { stroke-dashoffset: ${ARC_LEN}; opacity: 0; }
        15%  { opacity: 0.75; }
        85%  { opacity: 0.75; }
        100% { stroke-dashoffset: 0; opacity: 0; }
      }

      /* Counter number fade in */
      @keyframes numFade_${uid} {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      /* Stats row items slide up */
      @keyframes statUp_${uid} {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .gauge-arc-fill-${uid} {
        stroke-dasharray: ${ARC_LEN};
        stroke-dashoffset: ${ARC_LEN};
        animation: arcFill_${uid} 1.6s cubic-bezier(0.4,0,0.2,1) 0.3s forwards;
      }

      .gauge-needle-${uid} {
        transform-origin: 200px 230px;
        transform-box: view-box;
        transform: rotate(-90deg);
        animation: needleSpin_${uid} 1.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s forwards;
      }

      .gauge-shimmer-${uid} {
        stroke-dasharray: 150 377.8;
        stroke-dashoffset: ${ARC_LEN};
        opacity: 0;
        animation: shimmerSweep_${uid} 8s ease-in-out 2.5s infinite;
      }

      .gauge-num-${uid} {
        animation: numFade_${uid} 0.4s ease 0.5s both;
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
          <linearGradient id="arcGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#10b981"/>
            <stop offset="35%"  stop-color="#84cc16"/>
            <stop offset="60%"  stop-color="#f59e0b"/>
            <stop offset="80%"  stop-color="#f97316"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>
          <linearGradient id="shimGrad_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="white" stop-opacity="0"/>
            <stop offset="35%"  stop-color="white" stop-opacity="0.10"/>
            <stop offset="50%"  stop-color="white" stop-opacity="0.55"/>
            <stop offset="65%"  stop-color="white" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </linearGradient>
          <filter id="arcGlow_${uid}">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="needleGlow_${uid}">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="shineGlow_${uid}">
            <feGaussianBlur stdDeviation="2.2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <mask id="arcMask_${uid}">
            <path d="M 32 230 A 168 168 0 0 1 368 230"
              fill="none" stroke="white" stroke-width="30"
              stroke-linecap="round"
              stroke-dasharray="${ARC_LEN}"
              stroke-dashoffset="${arcOffset}"/>
          </mask>
        </defs>

        <!-- Value + status -->
        <g class="gauge-num-${uid}">
          <text x="200" y="20" text-anchor="middle"
            font-size="18" font-weight="700" fill="white"
            font-family="Space Mono,monospace"
            id="gauge-num">${carbonVal.toFixed(1)}</text>
          <text x="200" y="34" text-anchor="middle"
            font-size="10" fill="#7a9bb5"
            font-family="Space Mono,monospace">g/kWh &nbsp; ${statusTxt}</text>
        </g>

        <!-- Track -->
        <path d="M 32 230 A 168 168 0 0 1 368 230"
          fill="none" stroke="#1e3448"
          stroke-width="22" stroke-linecap="round"/>

        <!-- Filled arc — CSS keyframe drives the animation -->
        <path class="gauge-arc-fill-${uid}"
          d="M 32 230 A 168 168 0 0 1 368 230"
          fill="none" stroke="url(#arcGrad_${uid})"
          stroke-width="22" stroke-linecap="round"
          filter="url(#arcGlow_${uid})"/>

        <!-- Shimmer -->
        <path class="gauge-shimmer-${uid}"
          d="M 32 230 A 168 168 0 0 1 368 230"
          fill="none" stroke="url(#shimGrad_${uid})"
          stroke-width="26" stroke-linecap="round"
          mask="url(#arcMask_${uid})"
          filter="url(#shineGlow_${uid})"/>

        <!-- Ticks -->
        ${ticks}

        <!-- Labels -->
        <text x="26"  y="248" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">0</text>
        <text x="86"  y="148" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">50</text>
        <text x="200" y="70"  fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">100</text>
        <text x="314" y="148" fill="#3d5a75" font-size="11"
          font-family="Space Mono,monospace" text-anchor="middle">150</text>

        <!-- Needle — CSS keyframe drives the spin -->
        <g class="gauge-needle-${uid}">
          <line x1="200" y1="238" x2="200" y2="98"
            stroke="rgba(239,68,68,0.2)" stroke-width="5"
            stroke-linecap="round"/>
          <line x1="200" y1="238" x2="200" y2="98"
            stroke="#ef4444" stroke-width="3"
            stroke-linecap="round"
            filter="url(#needleGlow_${uid})"/>
          <circle cx="200" cy="230" r="12"
            fill="#111d2e" stroke="#ef4444" stroke-width="2.5"/>
          <circle cx="200" cy="230" r="5" fill="#ef4444"/>
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
    </div>

    <script>
      // Counter: 0 → carbonVal in sync with arc fill (1.6s)
      (function() {
        const el  = document.getElementById('gauge-num');
        const target = ${carbonVal};
        const dur = 1600;
        const t0  = performance.now();
        function tick(now) {
          const t    = Math.min((now - t0) / dur, 1);
          const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
          if (el) el.textContent = (target * ease).toFixed(1);
          if (t < 1) requestAnimationFrame(tick);
          else if (el) el.textContent = target.toFixed(1);
        }
        setTimeout(() => requestAnimationFrame(tick), 300);
      })();
    </script>`;
}