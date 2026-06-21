/* ============================================================
   js/templates.js
   Static markup templates — builds the dashboard skeleton.
   Called once during init(), before any live data arrives.
   ============================================================ */

// ── Header section ───────────────────────────────────────────
function renderHeader() {
  const header = document.getElementById('dash-header');
  if (!header) return;

  header.innerHTML = `
    <div class="header-left">
      <div class="nz-clock-card">
        <div class="nz-clock-label">Current NZ Time</div>
        <div class="nz-clock-time">
          <span class="nz-clock-dot"></span>
          <span id="nz-live-clock">--:--:--</span>
        </div>
      </div>
    </div>

    <div class="header-center">
      <div class="header-logo">
        <img src="static/project-icon.png" alt="NZ Electricity Dashboard logo" class="header-logo-img">
        <span>New Zealand Electricity Dashboard</span>
      </div>
      <div class="header-sub">Live Electricity Market Dashboard</div>
    </div>

    <div class="header-right">
      <div class="live-badge">
        <span class="pulse-dot"></span>
        <span id="last-updated">Updated --:--</span>
      </div>
      <div class="status-chip" id="grid-status-chip">--</div>
    </div>`;
}

// ── KPI section ───────────────────────────────────────────────
function renderKPISection() {
  const section = document.getElementById('kpi-section');
  if (!section) return;

  section.innerHTML = `
    <div class="kpi-wrap">

      <div class="kpi-card" id="kpi-renewable">
        <div class="kpi-grid-overlay"></div>
        <div class="kpi-flow-line" style="--flow-dur:3.8s;--flow-delay:0s;top:30%"></div>
        <div class="kpi-flow-line" style="--flow-dur:5.5s;--flow-delay:2.1s;top:70%"></div>
        <div class="kpi-corner-dot" style="top:7px;left:7px;--corner-dur:2.8s;--corner-delay:0s;"></div>
        <div class="kpi-corner-dot" style="bottom:7px;right:7px;--corner-dur:3.2s;--corner-delay:1.4s;"></div>

        <div class="kpi-ring-wrap">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="16" fill="none" stroke="var(--border-base)" stroke-width="4"/>
            <circle id="ring-renewable" cx="22" cy="22" r="16" fill="none"
              stroke="var(--teal)" stroke-width="4" stroke-linecap="round"
              stroke-dasharray="100" stroke-dashoffset="100"
              transform="rotate(-90 22 22)"/>
            <text id="ring-label" x="22" y="26" text-anchor="middle"
              font-size="8" fill="var(--teal)" font-family="Space Mono,monospace"
              font-weight="700">--</text>
          </svg>
        </div>
        <div class="kpi-label">Renewable Generation</div>
        <div class="kpi-value kpi-number" id="kpi-renewable-val">--%</div>
        <div class="kpi-sub" id="kpi-renewable-sub">--</div>
        <div class="kpi-spacer"></div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill" id="kpi-renewable-bar" style="width:0%"></div>
        </div>
      </div>

      <div class="kpi-card" id="kpi-carbon">
        <div class="kpi-grid-overlay" style="--grid-dur:6s;--grid-delay:1.5s;"></div>
        <div class="kpi-flow-line" style="--flow-dur:4.5s;--flow-delay:0.9s;top:35%"></div>
        <div class="kpi-flow-line" style="--flow-dur:6.2s;--flow-delay:3.3s;top:78%"></div>
        <div class="kpi-corner-dot" style="top:7px;right:7px;--corner-dur:3s;--corner-delay:0.7s;"></div>
        <div class="kpi-corner-dot" style="bottom:7px;left:7px;--corner-dur:2.4s;--corner-delay:1.9s;"></div>
        <div class="kpi-label">Carbon Intensity</div>
        <div class="kpi-value kpi-number" id="kpi-carbon-val">
          -- <span class="kpi-unit">gCO₂/kWh</span>
        </div>
        <div class="kpi-sub" id="kpi-carbon-sub">--</div>
        <div class="kpi-trend-badge" id="kpi-carbon-trend">--</div>
        <div class="kpi-spacer"></div>
        <div class="kpi-context" id="kpi-carbon-context">-- vs month avg</div>
      </div>

      <div class="kpi-card" id="kpi-spread">
        <div class="kpi-grid-overlay" style="--grid-dur:4.5s;--grid-delay:0.8s;"></div>
        <div class="kpi-flow-line" style="--flow-dur:5.1s;--flow-delay:1.7s;top:22%"></div>
        <div class="kpi-flow-line" style="--flow-dur:3.6s;--flow-delay:0.4s;top:62%"></div>
        <div class="kpi-corner-dot" style="top:7px;left:7px;--corner-dur:3.5s;--corner-delay:1.1s;"></div>
        <div class="kpi-corner-dot" style="bottom:7px;right:7px;--corner-dur:2.7s;--corner-delay:2.3s;"></div>
        <div class="kpi-label">NI / SI Price Spread</div>
        <div class="kpi-value kpi-number" id="kpi-spread-val">
          $-- <span class="kpi-unit">/MWh</span>
        </div>
        <div class="kpi-sub" id="kpi-spread-sub">--</div>
        <div class="kpi-trend-badge" id="kpi-spread-badge">--</div>
        <div class="kpi-spacer"></div>
        <div class="kpi-context" id="kpi-spread-context">OTA $-- · BEN $--</div>
      </div>

      <div class="kpi-card" id="kpi-reserves">
        <div class="kpi-grid-overlay" style="--grid-dur:5.5s;--grid-delay:2s;"></div>
        <div class="kpi-flow-line" style="--flow-dur:4.2s;--flow-delay:2.6s;top:40%"></div>
        <div class="kpi-flow-line" style="--flow-dur:5.8s;--flow-delay:1.1s;top:75%"></div>
        <div class="kpi-corner-dot" style="top:7px;left:7px;--corner-dur:2.6s;--corner-delay:0.3s;"></div>
        <div class="kpi-corner-dot" style="bottom:7px;right:7px;--corner-dur:3.4s;--corner-delay:1.7s;"></div>

        <div class="blink-dot-wrap" id="reserves-blink">
          <div class="blink-dot"></div>
          <span id="reserves-stress-label">--</span>
        </div>
        <div class="kpi-label">Grid Reserves</div>
        <div class="kpi-value kpi-number" id="kpi-reserves-val">--</div>
        <div class="reserves-detail" id="reserves-detail">
          <div class="reserves-row">
            <span class="reserves-island">NI</span>
            <span>FIR <b id="ni-fir">$--</b> &nbsp; SIR <b id="ni-sir">$--</b></span>
          </div>
          <div class="reserves-bar">
            <div class="reserves-bar-fill teal" id="ni-bar" style="width:0%"></div>
          </div>
          <div class="reserves-row">
            <span class="reserves-island">SI</span>
            <span>FIR <b id="si-fir">$--</b> &nbsp; SIR <b id="si-sir">$--</b></span>
          </div>
          <div class="reserves-bar">
            <div class="reserves-bar-fill blue" id="si-bar" style="width:0%"></div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Row 1: Map, Carbon Gauge, Price Last 24h ───────────────────
function renderRow1() {
  const row = document.getElementById('row1');
  if (!row) return;

  row.innerHTML = `
    <div class="chart-panel" id="panel-map">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/regional-price-overview-icon.png"
               class="panel-icon-img" alt="map" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Regional Price Overview ($/MWh)</div>
          <div class="panel-sub" id="map-subtitle">14 grid zones · current trading period</div>
        </div>
      </div>
      <div class="nz-map-shell" id="nz-map-shell">
        <svg
          id="nz-price-map"
          viewBox="0 0 620 700"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="New Zealand electricity price map"
        >
          <g id="nz-map-base"></g>
          <g id="nz-map-lines"></g>
          <g id="nz-map-dots"></g>
          <g id="nz-map-labels"></g>
          <g id="nz-map-debug"></g>
          <g id="nz-map-legend"></g>
        </svg>
      </div>
    </div>

    <div class="chart-panel" id="panel-gauge">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/carbon-emission-icon.png"
               class="panel-icon-img" alt="carbon" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Carbon Emissions (g/kWh)</div>
          <div class="panel-sub" id="gauge-subtitle">Last updated --</div>
        </div>
      </div>
      <div id="gauge-container"></div>
    </div>

    <div class="chart-panel" id="panel-price24">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/price-last-24hrs-icon.png"
               class="panel-icon-img" alt="price" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Price Last 24 Hours ($/MWh)</div>
          <div class="panel-sub" id="price24-subtitle">Last updated --</div>
        </div>
      </div>
      <div id="chart-price24"></div>
    </div>`;
}

// ── Row 2: Daily Summary, Carbon/Renewable Trend, NI/SI Spread ─
function renderRow2() {
  const row = document.getElementById('row2');
  if (!row) return;

  row.innerHTML = `
    <div class="chart-panel" id="panel-summary">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/daily-market-summary-icon.png"
               class="panel-icon-img" alt="summary" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Daily Market Summary</div>
          <div class="panel-sub">30-day price · carbon · renewable trend</div>
        </div>
      </div>
      <div id="chart-summary"></div>
    </div>

    <div class="chart-panel" id="panel-trend">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/carbon-renewable-trend-icon.png"
               class="panel-icon-img" alt="trend" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Carbon &amp; Renewable Trend</div>
          <div class="panel-sub">Last 7 days hourly</div>
        </div>
      </div>
      <div id="chart-trend"></div>
    </div>

    <div class="chart-panel" id="panel-spread">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/price-spread-icon.png"
               class="panel-icon-img" alt="spread" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">NI / SI Price Spread</div>
          <div class="panel-sub">Auckland vs Benmore · last 48 hrs</div>
        </div>
      </div>
      <div id="chart-spread"></div>
    </div>`;
}

// ── Row 3: Generation Insights panels ───────────────────────────
function renderRow3() {
  const row = document.getElementById('row3');
  if (!row) return;

  row.innerHTML = `
    <!-- Panel 4 — Renewable Shortfall vs Carbon Intensity -->
    <div class="chart-panel" id="panel-gen-carbon">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/carbon-emission-icon.png"
               class="panel-icon-img" alt="generation carbon" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Renewable Shortfall vs Carbon</div>
          <div class="panel-sub" id="gen-carbon-subtitle">Wind &amp; solar utilisation · last 48 hrs</div>
        </div>
      </div>
      <div class="gen-insight-badge" id="gen-carbon-badge">
        <span class="gen-badge-dot" id="gen-carbon-dot"></span>
        <span id="gen-carbon-badge-text">--</span>
      </div>
      <div id="chart-gen-carbon"></div>
    </div>

    <!-- Panel 5 — NI vs SI Generation Imbalance vs HVDC Spread -->
    <div class="chart-panel" id="panel-gen-spread">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/price-spread-icon.png"
               class="panel-icon-img" alt="island generation spread" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Island Generation vs HVDC Spread</div>
          <div class="panel-sub" id="gen-spread-subtitle">SI wind imbalance · last 48 hrs</div>
        </div>
      </div>
      <div class="gen-insight-badge" id="gen-spread-badge">
        <span class="gen-badge-dot" id="gen-spread-dot"></span>
        <span id="gen-spread-badge-text">--</span>
      </div>
      <div id="chart-gen-spread"></div>
    </div>

    <!-- Panel 6 — Renewable Shortfall vs Price Scarcity -->
    <div class="chart-panel" id="panel-gen-price">
      <div class="panel-header">
        <div class="panel-icon-wrap">
          <img src="static/price-last-24hrs-icon.png"
               class="panel-icon-img" alt="generation price" />
        </div>
        <div class="panel-header-text">
          <div class="panel-title">Renewable Shortfall vs Price</div>
          <div class="panel-sub" id="gen-price-subtitle">Supply scarcity · last 48 hrs</div>
        </div>
      </div>
      <div class="gen-insight-badge" id="gen-price-badge">
        <span class="gen-badge-dot" id="gen-price-dot"></span>
        <span id="gen-price-badge-text">--</span>
      </div>
      <div id="chart-gen-price"></div>
    </div>`;
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
function renderProfile() {
  const section = document.getElementById('profile-section');
  if (!section) return;

  const STACK = [
    'Python', 'FastAPI', 'PostgreSQL', 'dbt', 'GitHub Actions',
    'Plotly', 'HTML · CSS · JS', 'Neon', 'em6 API',
  ];

  const LINKS = [
    { icon: 'static/linkedin-icon.png',   label: 'LinkedIn',  url: 'https://www.linkedin.com/in/dario-dang-89049020a/', color: '#0a66c2' },
    { icon: 'static/github-icon.png',     label: 'GitHub',    url: 'https://github.com/DarioDang',                      color: '#e2e8f0' },
    { icon: 'static/portfolio-icon.png',  label: 'Portfolio', url: 'https://dariodang.github.io/',                      color: '#14b8a6' },
  ];

  const stackHTML = STACK.map(tag =>
    `<span class="profile-tag">${tag}</span>`
  ).join('');

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

      <div class="pf-icon-row">
        <div class="pf-icon-divider"></div>
        <div class="pf-icons">${iconsHTML}</div>
      </div>
    </div>`;

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