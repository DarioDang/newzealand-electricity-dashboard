/* ============================================================
   js/dashboard.js
   Main app entry point — fetches data and wires every component.
   ============================================================ */

// ── Loading progress helpers ────────────────────────────────
function setProgress(percent, message) {
  if (window.setLoaderTarget) {
    window.setLoaderTarget(percent, message);
  }
}

function completeProgress() {
  if (window.finishLoader) {
    window.finishLoader();
  }
}

function nextPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

// ── Helpers ─────────────────────────────────────────────────

function safeFloat(val, fallback = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function toNZT(utcStr) {
  try {
    const dt = new Date(utcStr);
    return new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour12: false,
    }).format(dt).replace(',', '');
  } catch { return '--'; }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

let _cachedPriceRegions = [];
// ── Step 3A: Update header ───────────────────────────────────

function updateHeader(carbon) {
  if (!carbon) return;
  const ts = toNZT(carbon.timestamp_utc);
  setText('last-updated', `Updated ${ts} NZST`);
  const chip = document.getElementById('grid-status-chip');
  if (chip) {
    const status = carbon.grid_status || '--';
    chip.textContent = status;
    chip.className = 'status-chip';
    if (status.toLowerCase().includes('dirty'))    chip.classList.add('dirty');
    if (status.toLowerCase().includes('moderate')) chip.classList.add('moderate');
  }

  const sub = document.getElementById('gauge-subtitle');
  if (sub) sub.textContent = `Last updated ${ts}`;
  const p24 = document.getElementById('price24-subtitle');
  if (p24) p24.textContent = `Last updated ${ts}`;
}

// ── Map subtitle — uses regional prices timestamp (30-min live) ─

function updateMapSubtitle(priceRegions) {
  const sub = document.getElementById('map-subtitle');
  if (!sub) return;

  if (!priceRegions || priceRegions.length === 0) {
    sub.textContent = '14 grid zones · no data';
    return;
  }

  // Get latest timestamp from regional prices array
  const latest = priceRegions.reduce((max, r) =>
    r.timestamp_utc > max ? r.timestamp_utc : max,
    priceRegions[0].timestamp_utc
  );

  sub.textContent = `Last updated ${toNZT(latest)}`;
}

// ── Mobile price list (replaces map on mobile) ───────────
// ── Mobile price list — heatmap + NI/SI badge + sort toggle ─
// Thay thế toàn bộ function renderMobilePriceList cũ

function renderMobilePriceList(priceRegions) {
  const panel = document.getElementById('panel-map');
  if (!panel) return;
  if (window.innerWidth > 768) return;

  const existing = document.getElementById('mobile-price-list');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'mobile-price-list';

  if (!priceRegions || priceRegions.length === 0) {
    wrapper.innerHTML = `<div style="text-align:center;padding:20px;
      font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">
      No price data available
    </div>`;
    panel.appendChild(wrapper);
    return;
  }

  // ── Sort state ─────────────────────────────────────────
  // Persist sort preference in dataset so re-renders keep state
  const prevSort = panel.dataset.priceSort || 'price';

  function buildList(sortBy) {
    panel.dataset.priceSort = sortBy;

    const filtered = priceRegions.filter(r => r.price_nzd_mwh != null);

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.grid_zone_name || '').localeCompare(b.grid_zone_name || '');
      }
      if (sortBy === 'island') {
        // NI first, then SI; within each group sort by price desc
        if (a.island !== b.island) return a.island < b.island ? -1 : 1;
        return b.price_nzd_mwh - a.price_nzd_mwh;
      }
      // default: price desc
      return b.price_nzd_mwh - a.price_nzd_mwh;
    });

    const total    = sorted.length;
    const maxPrice = Math.max(...sorted.map(r => r.price_nzd_mwh));
    const minPrice = Math.min(...sorted.map(r => r.price_nzd_mwh));
    const priceRange = maxPrice - minPrice || 1;

    // Heatmap — rank-based, xanh → vàng → đỏ
    // Rank is always based on price desc regardless of sort order
    const priceRanked = [...filtered]
      .sort((a, b) => b.price_nzd_mwh - a.price_nzd_mwh)
      .map(r => r.grid_zone_id);

    function heatColor(gridZoneId) {
      const rank = priceRanked.indexOf(gridZoneId);
      const t = rank / (total - 1); // 0=đắt nhất, 1=rẻ nhất
      if (t < 0.5) {
        const s = t * 2;
        return `rgb(${Math.round(239 + (245-239)*s)},${Math.round(68 + (158-68)*s)},${Math.round(68 + (11-68)*s)})`;
      } else {
        const s = (t - 0.5) * 2;
        return `rgb(${Math.round(245 + (16-245)*s)},${Math.round(158 + (185-158)*s)},${Math.round(11 + (129-11)*s)})`;
      }
    }

    // ── Sort toggle bar ──────────────────────────────────
    const toggleBar = document.createElement('div');
    toggleBar.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px 10px;
    `;

    const sortLabel = document.createElement('span');
    sortLabel.style.cssText = `
      font-family: var(--font-mono);
      font-size: 8px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-right: 2px;
    `;
    sortLabel.textContent = 'SORT:';
    toggleBar.appendChild(sortLabel);

    const SORTS = [
      { key: 'price',  label: 'Price' },
      { key: 'island', label: 'NI / SI' },
      { key: 'name',   label: 'Name' },
    ];

    SORTS.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      const isActive = sortBy === key;
      btn.style.cssText = `
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 999px;
        border: 1px solid ${isActive ? 'rgba(20,184,166,0.7)' : 'var(--border-base)'};
        background: ${isActive ? 'rgba(20,184,166,0.12)' : 'transparent'};
        color: ${isActive ? '#5eead4' : 'var(--text-muted)'};
        cursor: pointer;
        transition: all 0.15s ease;
        letter-spacing: 0.3px;
      `;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        // Remove old grid and rebuild
        const oldGrid = wrapper.querySelector('.price-grid');
        const oldToggle = wrapper.querySelector('.sort-toggle');
        if (oldGrid) oldGrid.remove();
        if (oldToggle) oldToggle.remove();
        buildList(key);
      });
      toggleBar.appendChild(btn);
    });

    toggleBar.classList.add('sort-toggle');

    // ── Cards grid ───────────────────────────────────────
    const grid = document.createElement('div');
    grid.classList.add('price-grid');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 7px;
      padding: 0 14px 14px;
    `;

    sorted.forEach((region) => {
      const price  = parseFloat(region.price_nzd_mwh);
      const color  = heatColor(region.grid_zone_id);
      const barPct = Math.min(((price - minPrice) / priceRange) * 100, 100).toFixed(1);
      const island = region.island || '';

      const islandColor = island === 'NI' ? '#3b82f6' : '#10b981';

      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(13,31,45,0.75);
        border: 1px solid rgba(255,255,255,0.06);
        border-left: 3px solid ${color};
        border-radius: 9px;
        padding: 10px 10px 10px;
        position: relative;
        overflow: hidden;
      `;

      card.innerHTML = `
        <!-- Heat bar -->
        <div style="
          position:absolute; bottom:0; left:0;
          width:${barPct}%; height:2px;
          background:${color}; opacity:0.5;
          border-radius:0 1px 1px 0;
        "></div>

        <!-- NI/SI badge -->
        <div style="
          position:absolute; top:8px; right:8px;
          font-family:var(--font-mono);
          font-size:8px; font-weight:700;
          color:${islandColor};
          background:${islandColor}18;
          border:1px solid ${islandColor}40;
          border-radius:4px;
          padding:1px 5px;
          letter-spacing:0.3px;
        ">${island}</div>

        <!-- Region name -->
        <div style="
          font-family:var(--font-mono);
          font-size:9px; font-weight:700;
          color:var(--text-muted);
          text-transform:uppercase;
          letter-spacing:0.5px;
          margin-bottom:6px;
          padding-right:28px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${region.grid_zone_name || '--'}</div>

        <!-- Price -->
        <div style="
          font-family:var(--font-mono);
          font-size:16px; font-weight:700;
          color:${color};
          line-height:1;
        ">$${price.toFixed(2)}</div>

        <!-- Unit -->
        <div style="
          font-family:var(--font-mono);
          font-size:8px;
          color:var(--text-muted);
          margin-top:3px;
          opacity:0.7;
        ">/MWh</div>
      `;

      grid.appendChild(card);
    });

    wrapper.appendChild(toggleBar);
    wrapper.appendChild(grid);
  }

  buildList(prevSort);
  panel.appendChild(wrapper);
}

// ── Step 3B: KPI Card 1 — Renewable Generation ──────────────

function updateRenewableCard(carbon) {
  if (!carbon) return;
  const pct        = safeFloat(carbon.renewable_pct);
  const status     = carbon.grid_status || '--';
  const barPct     = Math.min(pct, 100);
  const colorClass = pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red';
  const valEl = document.getElementById('kpi-renewable-val');
  if (valEl) {
    valEl.textContent = `${pct.toFixed(1)}%`;
    valEl.className   = `kpi-value kpi-number ${colorClass}`;
  }
  setText('kpi-renewable-sub', status);
  const bar = document.getElementById('kpi-renewable-bar');
  if (bar) setTimeout(() => { bar.style.width = `${barPct}%`; }, 300);
  const ring  = document.getElementById('ring-renewable');
  const label = document.getElementById('ring-label');
  if (ring) {
    const offset = Math.round(100 - barPct);
    setTimeout(() => {
      ring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
      ring.setAttribute('stroke-dashoffset', offset);
    }, 400);
  }
  if (label) label.textContent = Math.round(barPct);
}

// ── Step 3C: KPI Card 2 — Carbon Intensity ──────────────────

function updateCarbonCard(carbon) {
  if (!carbon) return;
  const val    = safeFloat(carbon.nz_carbon_gkwh);
  const status = carbon.carbon_status || '--';
  const trend  = carbon.carbon_trend  || 'Stable';
  const vsMon  = safeFloat(carbon.vs_month_avg_pct);
  setHTML('kpi-carbon-val', `${val.toFixed(1)} <span class="kpi-unit">gCO₂/kWh</span>`);
  setText('kpi-carbon-sub', status);
  const trendEl = document.getElementById('kpi-carbon-trend');
  if (trendEl) {
    let icon  = '→', color = '#f59e0b';
    if (trend === 'Improving') { icon = '↓'; color = '#10b981'; }
    if (trend === 'Worsening') { icon = '↑'; color = '#ef4444'; }
    trendEl.textContent      = `${icon} ${trend}`;
    trendEl.style.color      = color;
    trendEl.style.border     = `1px solid ${color}40`;
    trendEl.style.background = `${color}15`;
  }
  const sign = vsMon >= 0 ? '+' : '';
  setText('kpi-carbon-context', `${sign}${vsMon.toFixed(1)}% vs month avg`);
}

// ── Step 3D: KPI Card 3 — NI/SI Spread ──────────────────────

function updateSpreadCard(spread) {
  if (!spread) return;
  const val       = safeFloat(spread.ni_si_spread);
  const direction = spread.spread_direction || '--';
  const spreadSt  = spread.spread_status    || '--';
  const ota       = safeFloat(spread.ota_price);
  const ben       = safeFloat(spread.ben_price);
  let color = '#7a9bb5', icon = '—';
  if (val > 0) { color = '#ef4444'; icon = '▲'; }
  if (val < 0) { color = '#10b981'; icon = '▼'; }
  const valEl = document.getElementById('kpi-spread-val');
  if (valEl) {
    valEl.style.color = color;
    valEl.innerHTML   = `${icon} $${Math.abs(val).toFixed(2)} <span class="kpi-unit">/MWh</span>`;
  }
  setText('kpi-spread-sub', direction);
  const badge = document.getElementById('kpi-spread-badge');
  if (badge) {
    badge.textContent      = spreadSt;
    badge.style.color      = color;
    badge.style.border     = `1px solid ${color}40`;
    badge.style.background = `${color}15`;
  }
  setText('kpi-spread-context', `OTA $${ota.toFixed(2)} · BEN $${ben.toFixed(2)}`);
}

// ── Step 3E: KPI Card 4 — Grid Reserves ─────────────────────

function updateReservesCard(reserves) {
  if (!reserves || reserves.length === 0) return;
  const ni = reserves.find(r => r.region === 'NI') || {};
  const si = reserves.find(r => r.region === 'SI') || {};
  const stress = ni.grid_stress || si.grid_stress || '--';
  let stressColor = '#14b8a6';
  if (stress === 'High')   stressColor = '#ef4444';
  if (stress === 'Medium') stressColor = '#f59e0b';
  const valEl = document.getElementById('kpi-reserves-val');
  if (valEl) {
    valEl.textContent    = stress;
    valEl.style.color    = stressColor;
    valEl.style.fontSize = '22px';
  }
  const dot = document.querySelector('#reserves-blink .blink-dot');
  if (dot) dot.style.background = stressColor;
  const stressLabel = document.getElementById('reserves-stress-label');
  if (stressLabel) {
    stressLabel.textContent = stress;
    stressLabel.style.color = stressColor;
  }
  const niFir = safeFloat(ni.fir_price);
  const niSir = safeFloat(ni.sir_price);
  const siFir = safeFloat(si.fir_price);
  const siSir = safeFloat(si.sir_price);
  setText('ni-fir', `$${niFir.toFixed(2)}`);
  setText('ni-sir', `$${niSir.toFixed(2)}`);
  setText('si-fir', `$${siFir.toFixed(2)}`);
  setText('si-sir', `$${siSir.toFixed(2)}`);
  const niBar = document.getElementById('ni-bar');
  const siBar = document.getElementById('si-bar');
  if (niBar) setTimeout(() => { niBar.style.width = `${Math.min(niFir / 20 * 100, 100)}%`; }, 300);
  if (siBar) setTimeout(() => { siBar.style.width = `${Math.min(siFir / 20 * 100, 100)}%`; }, 400);
}

// ── Step 8: Pipeline section ─────────────────────────────────

function renderPipeline() {
  const section = document.getElementById('pipeline-section');
  if (!section) return;

  const STEPS = [
    { icon: 'static/em6-icon.png',            name: 'Energy Market Service', desc: 'Free API<br>5 endpoints<br>30 min intervals' },
    { icon: 'static/github-action-icon.png',  name: 'GitHub Actions',        desc: 'Cron scheduler<br>ETL trigger<br>Free tier' },
    { icon: 'static/fast-api-icon.png',       name: 'FastAPI',               desc: 'Python backend<br>REST endpoints<br>Pydantic models' },
    { icon: 'static/neon-postgres-icon.png',  name: 'Neon Postgres',         desc: 'Cloud database<br>ap-southeast-2<br>Always free' },
    { icon: 'static/dbt-icon.png',            name: 'dbt',                   desc: 'Staging views<br>Mart tables<br>82 data tests' },
  ];

  const INFO = [
    'Every 30 min · em6 API → Neon raw tables',
    'Nightly · dbt run → mart refresh → 7-day purge',
    '82 data quality tests on every run',
    'Neon Postgres Database · cloud free tier',
  ];

  const ARROW = `
    <div class="pipe-arrow">
      <div class="pipe-arrow-dash"></div>
      <div class="pipe-arrow-gap"></div>
      <div class="pipe-arrow-dash"></div>
      <div class="pipe-arrow-gap"></div>
      <div class="pipe-arrow-head"></div>
    </div>`;

  const stepsHTML = STEPS.map((step, i) =>
    `<div class="pipe-step" style="animation-delay:${(i+1)*0.1}s;">
      <img src="${step.icon}" alt="${step.name}" />
      <div class="pipe-step-name">${step.name}</div>
      <div class="pipe-step-desc">${step.desc}</div>
    </div>`
  ).join(ARROW);

  const infoHTML = INFO.map(text =>
    `<div class="pipe-info-item"><div class="pipe-info-dot"></div>${text}</div>`
  ).join('');

  section.innerHTML = `
    <div class="section-divider">
      <div class="divider-line left"></div>
      <div class="divider-label">Data Pipeline Architecture</div>
      <div class="divider-line right"></div>
    </div>
    <div class="pipeline-steps">${stepsHTML}</div>
    <div class="pipe-info-bar">${infoHTML}</div>`;

  const steps = section.querySelectorAll('.pipe-step');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  steps.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i*0.08}s, transform 0.5s ease ${i*0.08}s`;
    observer.observe(el);
  });
}

// ── Step 9: Profile section ──────────────────────────────────
// Redesigned layout — no icon circles (avoids clipping).
// Three horizontal cards, each with a free-standing icon,
// text block, and animated accent line on hover.

function renderProfile() {
  const section = document.getElementById('profile-section');
  if (!section) return;

  const STACK = [
    'Python', 'FastAPI', 'PostgreSQL', 'dbt', 'GitHub Actions',
    'Plotly', 'HTML · CSS · JS', 'Neon', 'em6 API',
  ];

  // Icon-only links — no labels, no cards, just the icon as a clickable link
  const LINKS = [
    { icon: 'static/linkedin-icon.png',   label: 'LinkedIn',  url: 'https://www.linkedin.com/in/dario-dang-89049020a/', color: '#0a66c2' },
    { icon: 'static/github-icon.png',     label: 'GitHub',    url: 'https://github.com/DarioDang',                      color: '#e2e8f0' },
    { icon: 'static/portfolio-icon.png',  label: 'Portfolio', url: 'https://dariodang.github.io/',                      color: '#14b8a6' },
  ];

  const stackHTML = STACK.map(tag =>
    `<span class="profile-tag">${tag}</span>`
  ).join('');

  // Clean icon-only links — no background, no text
  const iconsHTML = LINKS.map((link, i) => `
    <a class="pf-icon-link"
       href="${link.url}"
       target="_blank"
       rel="noopener noreferrer"
       title="${link.label}"
       style="--ic:${link.color}; animation-delay:${0.6 + i * 0.1}s;">
      <img src="${link.icon}" alt="${link.label}" />
    </a>`
  ).join('');

  section.innerHTML = `
    <div class="section-divider">
      <div class="divider-line left"></div>
      <div class="divider-label">About the Builder</div>
      <div class="divider-line right"></div>
    </div>

    <div class="profile-wrap">
      <!-- Bio — top area, same as before -->
      <div class="profile-bio">
        <div class="profile-eyebrow">Data Engineering · Portfolio Project</div>
        <h2 class="profile-name">Dario Dang</h2>
        <p class="profile-desc">
          Built this dashboard to demonstrate an end-to-end data engineering
          pipeline — from live API ingestion through cloud warehousing and dbt
          modelling, to a real-time frontend served without any paid compute.
        </p>
        <div class="profile-tags">${stackHTML}</div>
      </div>

      <!-- Icon row — pinned to bottom center of the card -->
      <div class="pf-icon-row">
        <div class="pf-icon-divider"></div>
        <div class="pf-icons">${iconsHTML}</div>
      </div>
    </div>`;

  // scroll entrance
  const wrap = section.querySelector('.profile-wrap');
  if (wrap && window.IntersectionObserver) {
    wrap.style.opacity   = '0';
    wrap.style.transform = 'translateY(24px)';
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        wrap.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        wrap.style.opacity    = '1';
        wrap.style.transform  = 'translateY(0)';
        obs.unobserve(wrap);
      }
    }, { threshold: 0.1 });
    obs.observe(wrap);
  }
}

// ── Main init ────────────────────────────────────────────────

async function init() {
  let carbonForGauge = null;

  const dashboard = document.getElementById("dashboard");
  if (dashboard) dashboard.classList.remove("hidden");

  startClock();
  renderPipeline();
  renderProfile();

  try {
    setProgress(15, "Loading NZ map...");
    await nextPaint();

    if (window.initNZPriceMap) {
      await window.initNZPriceMap();
    }

    setProgress(25, "Loading cached data...");
    const staleData = await API.fetchAll();  
    if (staleData?.carbon) {
      carbonForGauge = staleData.carbon;
      updateHeader(staleData.carbon);
      updateRenewableCard(staleData.carbon);
      updateCarbonCard(staleData.carbon);
      updateSpreadCard(staleData.spread);
      updateReservesCard(staleData.reserves);
      if (window.renderNZPriceMap) {
        window.renderNZPriceMap(staleData.priceRegions || []);
      }
      updateMapSubtitle(staleData.priceRegions);
      _cachedPriceRegions = staleData.priceRegions || [];
      renderMobilePriceList(staleData.priceRegions);
    }

    setProgress(50, "Loading chart engine...");
    await nextPaint();

    if (!window.loadPlotly) {
      throw new Error("loadPlotly() is not available.");
    }
    await window.loadPlotly();

    if (!window.Plotly) {
      throw new Error("Plotly is still not available after loadPlotly().");
    }

    setProgress(65, "Rendering charts...");
    await nextPaint();
    window.renderPrice24Chart(staleData?.priceNodes);
    window.renderSummaryChart(staleData?.priceSummary);
    window.renderTrendChart(staleData?.carbonTrend);
    window.renderSpreadChart(staleData?.spreadTrend);

    setProgress(85, "Finalizing...");
    await nextPaint();

    setTimeout(window.initChartAnimations, 80);
    document.body.classList.add("ready");

    window.addEventListener(
      "dashboard-loader-hidden",
      () => { if (carbonForGauge) renderGauge(carbonForGauge); },
      { once: true }
    );

    setProgress(100, "Dashboard ready");
    completeProgress();

  } catch (err) {
    console.error("❌ Dashboard init error:", err);
    document.body.classList.add("ready");
    setProgress(100, "Unable to load latest data");
    completeProgress();
  }

  setInterval(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const live = await API.fetchLive();

      updateHeader(live.carbon);
      updateRenewableCard(live.carbon);
      updateCarbonCard(live.carbon);
      updateSpreadCard(live.spread);
      updateReservesCard(live.reserves);

      if (live.priceRegions && window.renderNZPriceMap) {
        window.renderNZPriceMap(live.priceRegions);
      }
      updateMapSubtitle(live.priceRegions); 
      _cachedPriceRegions = live.priceRegions || [];  
      renderMobilePriceList(live.priceRegions);

      console.log("🔄 Live data refreshed");
    } catch (err) {
      console.warn("⚠️ Refresh failed:", err);
    }
  }, CONFIG.REFRESH_INTERVAL_MS);

  // ── Handle resize — 
  let lastIsMobile = window.innerWidth <= 768;

  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;

    
    if (isMobile === lastIsMobile) return;
    lastIsMobile = isMobile;

    if (isMobile) {
      
      renderMobilePriceList(_cachedPriceRegions);
    } else {
      
      const existing = document.getElementById('mobile-price-list');
      if (existing) existing.remove();

      const mapShell = document.querySelector('.nz-map-shell');
      if (mapShell) mapShell.style.display = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);