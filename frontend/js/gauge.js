/* ============================================================
   js/gauge.js  — Redesigned premium gauge
   ============================================================ */

const GAUGE_CX = 200;
const GAUGE_CY = 270;
const GAUGE_R  = 155;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function renderGauge(carbon) {
  const container = document.getElementById('gauge-container');
  if (!container) return;

  const carbonVal    = carbon ? parseFloat(carbon.nz_carbon_gkwh         || 0) : 0;
  const renewablePct = carbon ? parseFloat(carbon.renewable_pct          || 0) : 0;
  const monthAvg     = carbon ? parseFloat(carbon.current_month_avg_gkwh || 0) : 0;
  const yearAvg      = carbon ? parseFloat(carbon.current_year_avg_gkwh  || 0) : 0;
  const statusTxt    = carbon ? (carbon.carbon_status || '')              : '';

  const MAX_VAL       = CONFIG.GAUGE_VALUE_MAX;
  const gaugeProgress = Math.min(Math.max(carbonVal / MAX_VAL, 0), 1);
  const needleAngle   = -90 + gaugeProgress * 180;

  // ── Geometry ─────────────────────────────────────────────
  const startPt  = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R, -90);
  const endPt    = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R,  90);

  const zone1Angle = -90 + (50  / MAX_VAL) * 180;
  const zone2Angle = -90 + (100 / MAX_VAL) * 180;
  const zone1Pt    = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R, zone1Angle);
  const zone2Pt    = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R, zone2Angle);

  // Outer glow arc (slightly larger radius)
  const glowR     = GAUGE_R + 2;
  const glowStart = polarToCartesian(GAUGE_CX, GAUGE_CY, glowR, -90);
  const glowEnd   = polarToCartesian(GAUGE_CX, GAUGE_CY, glowR,  90);

  // Arc paths
  const f = v => v.toFixed(2);
  const arc = (p1, p2, r) =>
    `M ${f(p1.x)} ${f(p1.y)} A ${r} ${r} 0 0 1 ${f(p2.x)} ${f(p2.y)}`;

  const trackPath  = arc(startPt, endPt, GAUGE_R);
  const greenPath  = arc(startPt, zone1Pt, GAUGE_R);
  const orangePath = arc(zone1Pt, zone2Pt, GAUGE_R);
  const redPath    = arc(zone2Pt, endPt, GAUGE_R);
  const glowPath   = arc(glowStart, glowEnd, glowR);

  // Progress arc (up to needle position) for highlight
  const needlePt      = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R, needleAngle);
  const progressLarge = gaugeProgress > 0.5 ? 1 : 0;
  const progressPath  = `M ${f(startPt.x)} ${f(startPt.y)} A ${GAUGE_R} ${GAUGE_R} 0 ${progressLarge} 1 ${f(needlePt.x)} ${f(needlePt.y)}`;

  // Labels
  const labelR    = GAUGE_R + 26;
  const lbl0      = polarToCartesian(GAUGE_CX, GAUGE_CY, labelR, -90);
  const lbl50     = polarToCartesian(GAUGE_CX, GAUGE_CY, labelR, zone1Angle);
  const lbl100    = polarToCartesian(GAUGE_CX, GAUGE_CY, labelR, zone2Angle);
  const lbl150    = polarToCartesian(GAUGE_CX, GAUGE_CY, labelR,  90);

  // Minor tick marks (every 18deg = 10 ticks between labels)
  let ticks = '';
  for (let i = 0; i <= 30; i++) {
    const angle     = -90 + i * 6;
    const isMajor   = i % 5 === 0;
    const innerR    = isMajor ? GAUGE_R - 14 : GAUGE_R - 8;
    const outerR    = isMajor ? GAUGE_R + 14 : GAUGE_R + 8;
    const inner     = polarToCartesian(GAUGE_CX, GAUGE_CY, innerR, angle);
    const outer     = polarToCartesian(GAUGE_CX, GAUGE_CY, outerR, angle);
    // colour: teal in green zone, amber in orange, red in red
    const pct = (angle + 90) / 180;
    const col = pct <= 50/MAX_VAL  ? 'rgba(16,185,129,0.5)'
              : pct <= 100/MAX_VAL ? 'rgba(245,158,11,0.5)'
              :                      'rgba(239,68,68,0.5)';
    ticks += `<line x1="${f(inner.x)}" y1="${f(inner.y)}" x2="${f(outer.x)}" y2="${f(outer.y)}"
      stroke="${col}" stroke-width="${isMajor ? 2 : 1}" stroke-linecap="round"/>`;
  }

  // Colour for needle based on value
  const needleColor = carbonVal <= 50  ? '#10b981'
                    : carbonVal <= 100 ? '#f59e0b'
                    :                    '#ef4444';

  const uid = Date.now();

  container.innerHTML = `
    <style>
      @keyframes needleSpin_${uid} {
        0%   { transform: rotate(-95deg); }
        60%  { transform: rotate(${(needleAngle + 4).toFixed(1)}deg); }
        80%  { transform: rotate(${(needleAngle - 2).toFixed(1)}deg); }
        100% { transform: rotate(${needleAngle.toFixed(1)}deg); }
      }
      .gauge-needle-${uid} {
        transform-origin: ${GAUGE_CX}px ${GAUGE_CY}px;
        transform-box: view-box;
        transform: rotate(-95deg);
        animation: needleSpin_${uid} 1.6s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
      }

      @keyframes arcReveal_${uid} {
        from { stroke-dashoffset: 600; opacity: 0; }
        to   { stroke-dashoffset: 0;   opacity: 1; }
      }
      .arc-reveal-${uid} {
        stroke-dasharray: 600;
        stroke-dashoffset: 600;
        animation: arcReveal_${uid} 1s ease-out forwards;
      }
      .arc-green-${uid}  { animation-delay: 0.1s; }
      .arc-orange-${uid} { animation-delay: 0.3s; }
      .arc-red-${uid}    { animation-delay: 0.5s; }

      @keyframes glowPulse_${uid} {
        0%,100% { opacity: 0.15; }
        50%     { opacity: 0.35; }
      }
      .arc-glow-${uid} {
        animation: glowPulse_${uid} 3s ease-in-out infinite;
      }

      @keyframes metricPop_${uid} {
        from { opacity: 0; transform: translateY(8px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .gauge-metric-${uid} {
        transform-box: fill-box;
        transform-origin: center;
        animation: metricPop_${uid} 0.6s ease-out 0.3s both;
      }

      @keyframes statUp_${uid} {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .gauge-stat-${uid}:nth-child(1) { animation: statUp_${uid} 0.5s ease 1.4s both; }
      .gauge-stat-${uid}:nth-child(2) { animation: statUp_${uid} 0.5s ease 1.6s both; }
      .gauge-stat-${uid}:nth-child(3) { animation: statUp_${uid} 0.5s ease 1.8s both; }

      @keyframes dotPulse_${uid} {
        0%,100% { r: 5; opacity: 1; }
        50%     { r: 7; opacity: 0.7; }
      }
      .needle-dot-${uid} { animation: dotPulse_${uid} 2s ease-in-out 2.2s infinite; }

      @keyframes scanLine_${uid} {
        0%   { transform: translateX(-100%); opacity: 0; }
        20%  { opacity: 0.6; }
        80%  { opacity: 0.6; }
        100% { transform: translateX(200%); opacity: 0; }
      }
      .gauge-scan-${uid} {
        animation: scanLine_${uid} 4s ease-in-out 2s infinite;
      }
    </style>

    <div class="gauge-wrap" style="position:relative;">

      <!-- Scan line effect -->
      <div class="gauge-scan-${uid}" style="
        position:absolute; top:0; left:0; right:0; bottom:0;
        background: linear-gradient(90deg, transparent, rgba(20,184,166,0.06), transparent);
        width:40%; pointer-events:none; z-index:2;">
      </div>

      <svg viewBox="0 0 400 310" class="gauge-svg" style="overflow:visible;">
        <defs>
          <!-- Needle glow filter -->
          <filter id="needleGlow_${uid}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- Hub glow -->
          <filter id="hubGlow_${uid}" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <!-- Arc glow -->
          <filter id="arcGlow_${uid}" x="-5%" y="-50%" width="110%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- Outer glow halo behind arc -->
        <path d="${glowPath}" fill="none" stroke="rgba(20,184,166,0.08)"
          stroke-width="36" stroke-linecap="round" class="arc-glow-${uid}"/>

        <!-- Track (dark background arc) -->
        <path d="${trackPath}" fill="none" stroke="#0d1f2d"
          stroke-width="24" stroke-linecap="round"/>
        <!-- Track inner highlight -->
        <path d="${trackPath}" fill="none" stroke="rgba(255,255,255,0.03)"
          stroke-width="20" stroke-linecap="round"/>

        <!-- Colour zones with reveal animation -->
        <path class="arc-reveal-${uid} arc-green-${uid}"
          d="${greenPath}" fill="none" stroke="#10b981"
          stroke-width="20" stroke-linecap="round"/>
        <path class="arc-reveal-${uid} arc-orange-${uid}"
          d="${orangePath}" fill="none" stroke="#f59e0b"
          stroke-width="20" stroke-linecap="butt"/>
        <path class="arc-reveal-${uid} arc-red-${uid}"
          d="${redPath}" fill="none" stroke="#ef4444"
          stroke-width="20" stroke-linecap="butt"/>

        <!-- Round end cap right -->
        <circle class="arc-reveal-${uid} arc-red-${uid}"
          cx="${f(endPt.x)}" cy="${f(endPt.y)}" r="10" fill="#ef4444"/>

        <!-- Zone glow (soft outer bloom) -->
        <path d="${greenPath}"  fill="none" stroke="rgba(16,185,129,0.18)"
          stroke-width="28" stroke-linecap="round" filter="url(#arcGlow_${uid})"/>
        <path d="${orangePath}" fill="none" stroke="rgba(245,158,11,0.15)"
          stroke-width="28" filter="url(#arcGlow_${uid})"/>
        <path d="${redPath}"    fill="none" stroke="rgba(239,68,68,0.15)"
          stroke-width="28" filter="url(#arcGlow_${uid})"/>

        <!-- Tick marks -->
        ${ticks}

        <!-- Labels -->
        <text x="${f(lbl0.x)}"   y="${f(lbl0.y   + 5)}" fill="#4a6a7a" font-size="10" font-family="Space Mono,monospace" text-anchor="middle" font-weight="700">0</text>
        <text x="${f(lbl50.x)}"  y="${f(lbl50.y  + 5)}" fill="#4a6a7a" font-size="10" font-family="Space Mono,monospace" text-anchor="middle" font-weight="700">50</text>
        <text x="${f(lbl100.x)}" y="${f(lbl100.y + 5)}" fill="#4a6a7a" font-size="10" font-family="Space Mono,monospace" text-anchor="middle" font-weight="700">100</text>
        <text x="${f(lbl150.x)}" y="${f(lbl150.y + 5)}" fill="#4a6a7a" font-size="10" font-family="Space Mono,monospace" text-anchor="middle" font-weight="700">150</text>

        <!-- Status + value text -->
        <g class="gauge-metric-${uid}">
          <text x="200" y="0" text-anchor="middle"
            font-size="10" font-weight="700" fill="${needleColor}" letter-spacing="2"
            font-family="Space Mono,monospace">${statusTxt.toUpperCase()}</text>
          <text x="200" y="30" text-anchor="middle"
            font-size="28" font-weight="700" fill="#e2e8f0"
            font-family="Space Mono,monospace" id="gauge-num">0.0</text>
          <text x="200" y="50" text-anchor="middle"
            font-size="9" fill="#4a6a7a" letter-spacing="1.5"
            font-family="Space Mono,monospace">g CO₂/kWh</text>
        </g>

        <!-- Needle -->
        <g class="gauge-needle-${uid}">
          <!-- Glow layer — rộng hơn và sáng hơn -->
          <line x1="${GAUGE_CX}" y1="${GAUGE_CY + 10}"
                x2="${GAUGE_CX}" y2="${GAUGE_CY - 130}"
            stroke="#2dd4bf" stroke-width="14" stroke-linecap="round"
            opacity="0.5" filter="url(#needleGlow_${uid})"/>
          <!-- Main needle -->
          <line x1="${GAUGE_CX}" y1="${GAUGE_CY + 10}"
                x2="${GAUGE_CX}" y2="${GAUGE_CY - 130}"
            stroke="#2dd4bf" stroke-width="3.5" stroke-linecap="round"
            filter="url(#needleGlow_${uid})"/>
          <!-- Bright tip -->
          <line x1="${GAUGE_CX}" y1="${GAUGE_CY - 112}"
                x2="${GAUGE_CX}" y2="${GAUGE_CY - 130}"
            stroke="#a7f3d0" stroke-width="2" stroke-linecap="round" opacity="0.95"/>
        </g>

        <!-- Hub rings -->
        <circle cx="${GAUGE_CX}" cy="${GAUGE_CY}" r="18"
          fill="#0a1520" stroke="${needleColor}" stroke-width="1" opacity="0.4"/>
        <circle cx="${GAUGE_CX}" cy="${GAUGE_CY}" r="13"
          fill="#0d1f2d" stroke="${needleColor}" stroke-width="1.5"
          filter="url(#hubGlow_${uid})"/>
        <circle cx="${GAUGE_CX}" cy="${GAUGE_CY}" r="6"
          fill="${needleColor}" class="needle-dot-${uid}"
          filter="url(#hubGlow_${uid})"/>
        <circle cx="${GAUGE_CX}" cy="${GAUGE_CY}" r="2.5" fill="white" opacity="0.9"/>
      </svg>

      <!-- Stats row -->
      <div class="gauge-stats" style="border-top: 1px solid rgba(20,184,166,0.12);">
        <div class="gauge-stat-item gauge-stat-${uid}">
          <div class="gauge-stat-value">${yearAvg.toFixed(0)}<span style="font-size:10px;color:var(--text-muted);margin-left:2px;">g/kWh</span></div>
          <div class="gauge-stat-label">2026 AVERAGE</div>
        </div>
        <div class="gauge-stat-item gauge-stat-mid gauge-stat-${uid}">
          <div class="gauge-stat-value">${monthAvg.toFixed(0)}<span style="font-size:10px;color:var(--text-muted);margin-left:2px;">g/kWh</span></div>
          <div class="gauge-stat-label">MAY AVERAGE</div>
        </div>
        <div class="gauge-stat-item gauge-stat-${uid}">
          <div class="gauge-stat-value gauge-stat-green">${renewablePct.toFixed(0)}<span style="font-size:14px;">%</span></div>
          <div class="gauge-stat-label">RENEWABLE</div>
        </div>
      </div>
    </div>`;

  const numberEl = container.querySelector('#gauge-num');
  animateGaugeNumber(numberEl, carbonVal, 1800, 400);
}

function animateGaugeNumber(el, target, duration = 1800, delay = 400) {
  if (!el) return;
  el.textContent = '0.0';
  const startTime = performance.now() + delay;
  function tick(now) {
    if (now < startTime) { requestAnimationFrame(tick); return; }
    const t    = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    el.textContent = (target * ease).toFixed(1);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(1);
  }
  requestAnimationFrame(tick);
}