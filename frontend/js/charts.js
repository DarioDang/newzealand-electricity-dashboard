/* ============================================================
   js/charts.js
   All Plotly chart builders for the dashboard.
     renderPrice24Chart(rows)   ← Step 6  ✅
     renderSummaryChart(rows)   ← Step 7A ✅
     renderTrendChart(rows)     ← Step 7B ✅
     renderSpreadChart(rows)    ← Step 7C ✅
   ============================================================ */
// ── Load plotly ───────────────────────────
// ── Load Plotly lazily ───────────────────────────
let plotlyLoadPromise = null;

function loadPlotly() {
  if (window.Plotly) {
    return Promise.resolve(window.Plotly);
  }

  if (plotlyLoadPromise) {
    return plotlyLoadPromise;
  }

  plotlyLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = "https://cdn.plot.ly/plotly-2.32.0.min.js";
    script.async = true;
    script.dataset.plotlyLoader = "true";

    script.onload = () => {
      if (window.Plotly) {
        console.log("✅ Plotly loaded");
        resolve(window.Plotly);
      } else {
        reject(new Error("Plotly script loaded but window.Plotly is missing"));
      }
    };

    script.onerror = () => {
      reject(new Error("Failed to load Plotly"));
    };

    document.body.appendChild(script);
  });

  return plotlyLoadPromise;
}

window.loadPlotly = loadPlotly;

// ── Shared Plotly layout defaults ───────────────────────────

const CHART_BASE_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  'transparent',
  font: {
    family: 'Space Mono, monospace',
    color:  '#7a9bb5',
    size:   11,
  },
  margin: { t: 12, r: 16, b: 48, l: 56 },
  xaxis: {
    gridcolor:  'rgba(255,255,255,0.04)',
    linecolor:  'rgba(255,255,255,0.08)',
    tickcolor:  'rgba(255,255,255,0.08)',
    showgrid:   true,
    zeroline:   false,
    tickfont:   { size: 10, color: '#4a6a7a' },
  },
  yaxis: {
    gridcolor:  'rgba(255,255,255,0.04)',
    linecolor:  'rgba(255,255,255,0.08)',
    tickcolor:  'rgba(255,255,255,0.08)',
    showgrid:   true,
    zeroline:   false,
    tickfont:   { size: 10, color: '#4a6a7a' },
    tickprefix: '$',
    ticksuffix: '',
  },
  legend: {
    bgcolor:     'transparent',
    borderwidth: 0,
    orientation: 'h',
    x:           0,
    y:           -0.22,
    font:        { size: 10, color: '#7a9bb5' },
    itemclick:   'toggle',
  },
  hovermode: window.innerWidth <= 768 ? false : 'x unified',
  hoverlabel: {
    bgcolor:     '#0d1f2d',
    bordercolor: '#1e3a4a',
    font:        { family: 'Space Mono, monospace', size: 11, color: '#e2e8f0' },
  },
};

const PLOTLY_CONFIG = {
  displayModeBar: false,
  responsive:     true,
  scrollZoom:     false,
};

// ── Node colour palette ──────────────────────────────────────

const NODE_COLORS = {
  OTA2201: '#14b8a6',
  HAY2201: '#3b82f6',
  BEN2201: '#f59e0b',
  WKM2201: '#10b981',
  KIK2201: '#8b5cf6',
  ISL2201: '#ef4444',
};

const FALLBACK_COLORS = ['#94a3b8', '#64748b', '#475569'];

function nodeColor(nodeId, index) {
  return NODE_COLORS[nodeId] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ── Utilities ────────────────────────────────────────────────

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const k = row[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
}

function renderNoData(containerId, message = 'No data available') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="
      display:flex; align-items:center; justify-content:center;
      height:220px; color:#4a6a7a; font-family:'Space Mono',monospace;
      font-size:12px; flex-direction:column; gap:8px;
    ">
      <span style="font-size:24px; opacity:0.4;">📊</span>
      <span>${message}</span>
    </div>`;
}

function watchResize(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !window.ResizeObserver || !window.Plotly) return;

  const ro = new ResizeObserver(() => {
    if (window.Plotly) {
      window.Plotly.Plots.resize(el);
    }
  });

  ro.observe(el.parentElement || el);
}

// ── Animation helpers ────────────────────────────────────────

function animatedPlot(containerId, traces, layout, delay = 120) {
  const emptyTraces = traces.map(t => ({ ...t, y: [] }));
  Plotly.newPlot(containerId, emptyTraces, layout, PLOTLY_CONFIG);
  setTimeout(() => {
    Plotly.react(containerId, traces, layout, PLOTLY_CONFIG);
  }, delay);
}

function animatedSpreadPlot(containerId, traces, layout, delay = 150) {
  const emptyTraces = traces.map(t =>
    t.type === 'bar'
      ? { ...t, y: t.y.map(() => 0) }
      : { ...t, y: [] }
  );
  Plotly.newPlot(containerId, emptyTraces, layout, PLOTLY_CONFIG);
  setTimeout(() => {
    Plotly.react(containerId, traces, layout, PLOTLY_CONFIG);
  }, delay);
}

// ── Animation 2: Scroll entrance ────────────────────────────

function initChartScrollAnimations() {
  const chartIds = [
    'chart-price24',
    'chart-summary',
    'chart-trend',
    'chart-spread',
    'chart-gen-carbon',
    'chart-gen-spread',
    'chart-gen-price',
  ];

  if (window._chartScrollInitDone) return;
  window._chartScrollInitDone = true;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = (entry.target.dataset.chartIndex || 0) * 80;
        entry.target.style.transition =
          `opacity 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms,
           transform 0.55s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
        const plotEl = entry.target;
        setTimeout(() => {
          if (window.Plotly) {
            window.Plotly.Plots.resize(plotEl);
          }
        }, 560);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -32px 0px' });

  chartIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.chartIndex = i;
    el.style.opacity      = '0';
    el.style.transform    = 'translateY(24px)';
    observer.observe(el);
  });
}

// ── Animation 3: Panel hover glow ────────────────────────────

function injectChartPanelHoverStyles() {
  if (document.getElementById('chart-panel-hover-style')) return;
  const style = document.createElement('style');
  style.id = 'chart-panel-hover-style';
  style.textContent = `
    .chart-panel {
      transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
    }
    .chart-panel:hover {
      border-color: rgba(20, 184, 166, 0.40) !important;
      box-shadow:   0 0 28px rgba(20, 184, 166, 0.08),
                    0 8px 32px rgba(0, 0, 0, 0.30) !important;
      transform:    translateY(-2px);
    }
    .chart-panel::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, #14b8a6, transparent);
      opacity: 0.4;
      transition: opacity 0.3s ease;
      border-radius: 14px 14px 0 0;
    }
    .chart-panel:hover::before {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

function initChartAnimations() {
  injectChartPanelHoverStyles();
  initChartScrollAnimations();
}


/* ============================================================
   Step 6 — Price Last 24 Hours
   ============================================================ */

function renderPrice24Chart(rows) {
  const containerId = 'chart-price24';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No price data available');
    return;
  }

  const byNode  = groupBy(rows, 'node_id');
  const nodeIds = Object.keys(byNode);

  const traces = nodeIds.map((nodeId, idx) => {
    const nodeRows = byNode[nodeId]
      .slice()
      .sort((a, b) => a.timestamp_nzt.localeCompare(b.timestamp_nzt));

    const x         = nodeRows.map(r => r.timestamp_nzt);
    const y         = nodeRows.map(r => r.price_nzd_mwh);
    const sample    = nodeRows[0];
    const label     = sample.city_name
      ? `${sample.city_name} (${sample.island})`
      : nodeId;
    const color     = nodeColor(nodeId, idx);
    const isRefNode = sample.is_reference_node;

    return {
      type: 'scatter', mode: 'lines',
      name: label, x, y,
      line: {
        color,
        width:     isRefNode ? 2 : 1.5,
        dash:      isRefNode ? 'solid' : 'dot',
        shape:     'spline',
        smoothing: 0.6,
      },
      opacity: isRefNode ? 1 : 0.7,
      hovertemplate:
        `<b>${label}</b><br>%{x|%d %b %H:%M} NZST<br><b>$%{y:.2f}/MWh</b><extra></extra>`,
    };
  });

  const priceBandShapes = [
    {
      type: 'rect', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 0, y1: 80,
      fillcolor: 'rgba(16,185,129,0.04)', line: { width: 0 }, layer: 'below',
    },
    {
      type: 'rect', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 80, y1: 200,
      fillcolor: 'rgba(245,158,11,0.04)', line: { width: 0 }, layer: 'below',
    },
    {
      type: 'line', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 80, y1: 80,
      line: { color: 'rgba(245,158,11,0.25)', width: 1, dash: 'dash' },
    },
    {
      type: 'line', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 200, y1: 200,
      line: { color: 'rgba(239,68,68,0.25)', width: 1, dash: 'dash' },
    },
  ];

  const bandAnnotations = [
    {
      xref: 'paper', yref: 'y', x: 1.01, y: 40,
      text: 'LOW', showarrow: false, xanchor: 'left',
      font: { size: 9, color: 'rgba(16,185,129,0.5)', family: 'Space Mono,monospace' },
    },
    {
      xref: 'paper', yref: 'y', x: 1.01, y: 140,
      text: 'MED', showarrow: false, xanchor: 'left',
      font: { size: 9, color: 'rgba(245,158,11,0.5)', family: 'Space Mono,monospace' },
    },
    {
      xref: 'paper', yref: 'y', x: 1.01, y: 220,
      text: 'HIGH', showarrow: false, xanchor: 'left',
      font: { size: 9, color: 'rgba(239,68,68,0.5)', family: 'Space Mono,monospace' },
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin: { t: 12, r: 40, b: 56, l: 56 },
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      tickformat:  '%H:%M\n%d %b',
      dtick:       6 * 3600 * 1000,
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '$',
      title: { text: '$/MWh', font: { size: 10, color: '#4a6a7a' }, standoff: 8 },
    },
    shapes:      priceBandShapes,
    annotations: bandAnnotations,
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.28 },
  };

  animatedPlot(containerId, traces, layout, 120);
  watchResize(containerId);
}


/* ============================================================
   Step 7A — Daily Market Summary
   Rolling 7-day window ending today.
   If less than 7 days of data exists, shows all available days
   without leaving empty space on the right.
   ============================================================ */

function renderSummaryChart(rows) {
  const containerId = 'chart-summary';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No summary data available');
    return;
  }

  const sorted = rows.slice().sort((a, b) => a.date_nzt.localeCompare(b.date_nzt));

  // ── Rolling 7-day window ──────────────────────────────────
  // Window end = latest date in data (not necessarily today).
  // Window start = 6 days before that, OR earliest available.
  // This means:
  //   - If 3 days of data: shows all 3, ticks every day
  //   - If 30 days of data: shows last 7, ticks every day
  //   - As new days arrive, window rolls forward automatically

  const latestDate  = new Date(sorted[sorted.length - 1].date_nzt + 'T00:00:00Z');
  const windowStart = new Date(latestDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 6);   // 7 days inclusive

  // Filter to window (use all data if less than 7 days)
  const earliestDate = new Date(sorted[0].date_nzt + 'T00:00:00Z');
  const effectiveStart = earliestDate > windowStart ? earliestDate : windowStart;

  const windowed = sorted.filter(r => {
    const d = new Date(r.date_nzt + 'T00:00:00Z');
    return d >= effectiveStart && d <= latestDate;
  });

  const x            = windowed.map(r => r.date_nzt);
  const avgPrice     = windowed.map(r => r.avg_price_ota);
  const avgCarbon    = windowed.map(r => r.avg_carbon_gkwh);
  const avgRenewable = windowed.map(r => r.avg_renewable_pct);

  // How many days of data do we actually have in the window?
  const dayCount = windowed.length;

  const traces = [
    {
      type: 'scatter', mode: 'lines+markers',
      name: 'Avg Price OTA', x, y: avgPrice, yaxis: 'y',
      line:   { color: '#14b8a6', width: 2.5, shape: 'spline', smoothing: 0.6 },
      marker: { size: 4, color: '#14b8a6' },
      hovertemplate: '<b>Avg Price</b>: $%{y:.2f}/MWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Carbon g/kWh', x, y: avgCarbon, yaxis: 'y',
      line: { color: '#f59e0b', width: 2, dash: 'dash', shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Carbon</b>: %{y:.1f} g/kWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines+markers',
      name: 'Renewable %', x, y: avgRenewable, yaxis: 'y2',
      line:   { color: '#10b981', width: 2, dash: 'dot', shape: 'spline', smoothing: 0.6 },
      marker: { size: 4, color: '#10b981' },
      hovertemplate: '<b>Renewable</b>: %{y:.1f}%<extra></extra>',
    },
  ];

  // ── X-axis range: fit exactly to data, no empty space ────
  // Add half-day padding on each side so first/last points
  // aren't clipped at the edge.
  const padMs      = 12 * 3600 * 1000;   // 12 hours padding
  const xRangeMin  = new Date(effectiveStart.getTime() - padMs).toISOString();
  const xRangeMax  = new Date(latestDate.getTime()    + padMs).toISOString();

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin: { t: 12, r: 52, b: 64, l: 52 },
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      tickformat:  '%d %b',
      // Always tick every day — Plotly skips if crowded
      dtick:       24 * 3600 * 1000,
      // Constrain to actual data range — no whitespace
      range:       [xRangeMin, xRangeMax],
      hoverformat: '%d %b %Y',
      // Limit visible ticks to 7 max
      nticks:      7,
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '$',
      title: { text: '$/MWh · g/kWh', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying: 'y', side: 'right', range: [0, 100],
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      tickfont:   { size: 10, color: '#4a6a7a' }, ticksuffix: '%',
      title: { text: 'Renewable %', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
  };

  animatedPlot(containerId, traces, layout, 160);
  watchResize(containerId);
}


/* ============================================================
   Step 7B — Carbon & Renewable Trend
   ============================================================ */

function renderTrendChart(rows) {
  const containerId = 'chart-trend';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No trend data available');
    return;
  }

  const sorted    = rows.slice().sort((a, b) => a.timestamp_nzt.localeCompare(b.timestamp_nzt));
  const x         = sorted.map(r => r.timestamp_nzt);
  const carbon    = sorted.map(r => r.nz_carbon_gkwh);
  const renewable = sorted.map(r => r.renewable_pct);

  const traces = [
    {
      type: 'scatter', mode: 'lines',
      name: 'Carbon g/kWh', x, y: carbon, yaxis: 'y',
      fill: 'tozeroy', fillcolor: 'rgba(245,158,11,0.08)',
      line: { color: '#f59e0b', width: 2.5, shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Carbon</b>: %{y:.1f} g/kWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Renewable %', x, y: renewable, yaxis: 'y2',
      fill: 'tozeroy', fillcolor: 'rgba(20,184,166,0.06)',
      line: { color: '#14b8a6', width: 2.5, shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Renewable</b>: %{y:.1f}%<extra></extra>',
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin: { t: 12, r: 52, b: 64, l: 52 },
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      tickformat:  '%d %b\n%H:%M',
      dtick:       24 * 3600 * 1000,
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '', ticksuffix: '',
      title: { text: 'Carbon g/kWh', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying: 'y', side: 'right', range: [0, 100],
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      tickfont:   { size: 10, color: '#4a6a7a' }, ticksuffix: '%',
      title: { text: 'Renewable %', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
  };

  animatedPlot(containerId, traces, layout, 200);
  watchResize(containerId);
}

/* ============================================================
   Step 7C — NI/SI Price Spread
   ============================================================ */

function renderSpreadChart(rows) {
  const containerId = 'chart-spread';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No spread data available');
    return;
  }

  const sorted = rows.slice().sort((a, b) => a.timestamp_nzt.localeCompare(b.timestamp_nzt));
  const x      = sorted.map(r => r.timestamp_nzt);
  const ota    = sorted.map(r => r.ota_price);
  const ben    = sorted.map(r => r.ben_price);
  const spread = sorted.map(r => r.ni_si_spread);

  const barColors = spread.map(v =>
    v > 0 ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.45)'
  );

  const traces = [
    {
      type: 'scatter', mode: 'lines',
      name: 'Auckland (OTA)', x, y: ota, yaxis: 'y',
      line: { color: '#14b8a6', width: 2, shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Auckland</b>: $%{y:.2f}/MWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Benmore (BEN)', x, y: ben, yaxis: 'y',
      line: { color: '#3b82f6', width: 2, shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Benmore</b>: $%{y:.2f}/MWh<extra></extra>',
    },
    {
      type: 'bar',
      name: 'NI/SI Spread', x, y: spread, yaxis: 'y2',
      marker: { color: barColors },
      hovertemplate: '<b>Spread</b>: $%{y:.2f}/MWh<extra></extra>',
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin:  { t: 12, r: 52, b: 64, l: 52 },
    barmode: 'overlay',
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      tickformat:  '%H:%M\n%d %b',
      dtick:       6 * 3600 * 1000,
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '$',
      title: { text: '$/MWh', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying:    'y', side: 'right',
      gridcolor:     'rgba(255,255,255,0.0)',
      zeroline:      true, zerolinecolor: 'rgba(255,255,255,0.08)',
      tickfont:      { size: 10, color: '#4a6a7a' }, tickprefix: '$',
      title: { text: 'Spread $/MWh', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
  };

  animatedSpreadPlot(containerId, traces, layout, 150);
  watchResize(containerId);
}

/* ============================================================
   Generation Insights — Panel 1
   Renewable Shortfall vs Carbon Intensity
   Dual axis: shortfall bars (MW) + carbon line (g/kWh)
   ============================================================ */

function renderGenCarbonChart(rows) {
  const containerId = 'chart-gen-carbon';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No generation data available');
    return;
  }

  // ── Aggregate WIN + SOL shortfall per timestamp ──────────
  const byTimestamp = {};
  rows.forEach(r => {
    const ts = r.timestamp_nzt;
    if (!byTimestamp[ts]) {
      byTimestamp[ts] = {
        ts,
        totalShortfall: 0,
        totalForecast:  0,
        totalPotential: 0,
        carbon:         r.nz_carbon_gkwh,
        renewable:      r.renewable_pct,
        types:          [],
      };
    }
    byTimestamp[ts].totalShortfall  += (r.shortfall_mw         || 0);
    byTimestamp[ts].totalForecast   += (r.forecast_mw          || 0);
    byTimestamp[ts].totalPotential  += (r.potential_forecast_mw|| 0);
    byTimestamp[ts].types.push(r.generation_label);
  });

  const sorted    = Object.values(byTimestamp).sort((a, b) => a.ts.localeCompare(b.ts));
  const x         = sorted.map(r => r.ts);
  const shortfall = sorted.map(r => r.totalShortfall);
  const carbon    = sorted.map(r => r.carbon);
  const utilPct   = sorted.map(r =>
    r.totalPotential > 0
      ? Math.round(r.totalForecast / r.totalPotential * 100)
      : null
  );

  // ── Update badge ─────────────────────────────────────────
  const latest     = sorted[sorted.length - 1];
  const badgeEl    = document.getElementById('gen-carbon-badge-text');
  const dotEl      = document.getElementById('gen-carbon-dot');
  if (badgeEl && latest) {
    const util = latest.totalPotential > 0
      ? Math.round(latest.totalForecast / latest.totalPotential * 100)
      : null;
    badgeEl.textContent = util !== null
      ? `Utilisation ${util}% · Carbon ${latest.carbon?.toFixed(1) ?? '--'} g/kWh`
      : 'Awaiting data';
    if (dotEl) {
      dotEl.style.background = util !== null && util < 90
        ? '#ef4444' : '#10b981';
      dotEl.style.boxShadow = util !== null && util < 90
        ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 6px rgba(16,185,129,0.6)';
    }
  }

  // ── Shortfall bar colors — red when high, teal when low ──
  const barColors = shortfall.map(v =>
    v > 50  ? 'rgba(239,68,68,0.55)'  :
    v > 20  ? 'rgba(245,158,11,0.50)' :
              'rgba(20,184,166,0.45)'
  );

  const traces = [
    {
      type: 'bar',
      name: 'Shortfall MW',
      x, y: shortfall,
      yaxis: 'y',
      marker: { color: barColors },
      hovertemplate: '<b>Shortfall</b>: %{y:.1f} MW<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Carbon g/kWh',
      x, y: carbon,
      yaxis: 'y2',
      line: { color: '#f59e0b', width: 2.5, shape: 'spline', smoothing: 0.6 },
      connectgaps: true,
      hovertemplate: '<b>Carbon</b>: %{y:.1f} g/kWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Utilisation %',
      x, y: utilPct,
      yaxis: 'y3',
      line: { color: '#14b8a6', width: 1.5, dash: 'dot', shape: 'spline', smoothing: 0.6 },
      connectgaps: true,
      opacity: 0.7,
      hovertemplate: '<b>Utilisation</b>: %{y:.0f}%<extra></extra>',
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin: { t: 12, r: 52, b: 64, l: 52 },
    barmode: 'overlay',
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      dtick:       12 * 3600 * 1000,
      tickformat:  '%d %b\n%H:%M',
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '', ticksuffix: ' MW',
      title: { text: 'Shortfall MW', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying: 'y', side: 'right',
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      tickfont:   { size: 10, color: '#4a6a7a' },
      title: { text: 'Carbon g/kWh', font: { size: 10, color: '#f59e0b' }, standoff: 6 },
    },
    yaxis3: {
      overlaying: 'y', side: 'right', anchor: 'free', position: 1,
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      range:      [50, 105],
      tickfont:   { size: 9, color: '#14b8a6' }, ticksuffix: '%',
      showgrid: false,
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
  };

  animatedSpreadPlot(containerId, traces, layout, 120);
  watchResize(containerId);
}


/* ============================================================
   Generation Insights — Panel 2
   NI vs SI Generation Imbalance vs HVDC Spread
   Dual axis: NI/SI wind bars + spread line
   ============================================================ */

function renderGenSpreadChart(rows) {
  const containerId = 'chart-gen-spread';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No island generation data available');
    return;
  }

  // ── Filter WIN only — most meaningful for HVDC story ────
  const wind = rows
    .filter(r => r.generation_type === 'WIN')
    .sort((a, b) => a.timestamp_nzt.localeCompare(b.timestamp_nzt));

  if (wind.length === 0) {
    renderNoData(containerId, 'No wind generation data available');
    return;
  }

  const x           = wind.map(r => r.timestamp_nzt);
  const niWind      = wind.map(r => r.ni_forecast_mw);
  const siWind      = wind.map(r => r.si_forecast_mw);
  const imbalance   = wind.map(r => r.si_ni_imbalance_mw);
  const spread      = wind.map(r => r.ni_si_spread);

  // ── Update badge ─────────────────────────────────────────
  const latestWithSpread = [...wind].reverse().find(r => r.ni_si_spread != null);
  const latest   = wind[wind.length - 1];
  const badgeEl  = document.getElementById('gen-spread-badge-text');
  const dotEl    = document.getElementById('gen-spread-dot');

  if (badgeEl && latestWithSpread) {
    const dir = latestWithSpread.spread_direction || '--';
    const st  = latestWithSpread.spread_status   || '--';
    const asOf = latestWithSpread.timestamp_nzt
      ? new Date(latestWithSpread.timestamp_nzt).toLocaleString('en-NZ', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        })
      : '';
    badgeEl.textContent = `${dir} · ${st} · Spread $${latestWithSpread.ni_si_spread.toFixed(2)}/MWh (as of ${asOf})`;

    if (dotEl) {
      const isConstrained = st === 'Constrained';
      dotEl.style.background = isConstrained ? '#ef4444' : '#14b8a6';
      dotEl.style.boxShadow  = isConstrained
        ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 6px rgba(20,184,166,0.6)';
    }
  } else if (badgeEl) {
    badgeEl.textContent = 'Spread data pending dbt refresh';
  }

  const imbalanceColors = imbalance.map(v =>
    v > 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
  );

  const traces = [
    {
      type: 'scatter', mode: 'lines',
      name: 'NI Wind MW', x, y: niWind, yaxis: 'y',
      line: { color: '#3b82f6', width: 2, shape: 'spline', smoothing: 0.6 },
      fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.06)',
      hovertemplate: '<b>NI Wind</b>: %{y:.0f} MW<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'SI Wind MW', x, y: siWind, yaxis: 'y',
      line: { color: '#10b981', width: 2, shape: 'spline', smoothing: 0.6 },
      fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.06)',
      hovertemplate: '<b>SI Wind</b>: %{y:.0f} MW<extra></extra>',
    },
    {
      type: 'bar',
      name: 'SI−NI Imbalance', x, y: imbalance, yaxis: 'y',
      marker: { color: imbalanceColors },
      opacity: 0.6,
      hovertemplate: '<b>SI−NI</b>: %{y:.0f} MW<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'NI/SI Spread', x, y: spread, yaxis: 'y2',
      line: { color: '#f59e0b', width: 2.5, dash: 'dot', shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Spread</b>: $%{y:.2f}/MWh<extra></extra>',
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin:  { t: 12, r: 52, b: 64, l: 52 },
    barmode: 'overlay',
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      dtick:       12 * 3600 * 1000,
      tickformat:  '%d %b\n%H:%M',
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '', ticksuffix: ' MW',
      title: { text: 'Generation MW', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying: 'y', side: 'right',
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      tickfont:   { size: 10, color: '#f59e0b' }, tickprefix: '$',
      title: { text: 'Spread $/MWh', font: { size: 10, color: '#f59e0b' }, standoff: 6 },
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
    shapes: [{
      type: 'line', xref: 'paper', yref: 'y',
      x0: 0, x1: 1, y0: 0, y1: 0,
      line: { color: 'rgba(255,255,255,0.08)', width: 1, dash: 'dot' },
    }],
  };

  animatedSpreadPlot(containerId, traces, layout, 160);
  watchResize(containerId);
}


/* ============================================================
   Generation Insights — Panel 3
   Renewable Shortfall vs Price Scarcity
   Dual axis: shortfall area + avg price line
   ============================================================ */

function renderGenPriceChart(rows) {
  const containerId = 'chart-gen-price';
  if (!rows || rows.length === 0) {
    renderNoData(containerId, 'No generation price data available');
    return;
  }

  // ── Aggregate WIN + SOL per timestamp ───────────────────
  const byTimestamp = {};
  rows.forEach(r => {
    const ts = r.timestamp_nzt;
    if (!byTimestamp[ts]) {
      byTimestamp[ts] = {
        ts,
        totalShortfall: 0,
        totalForecast:  0,
        totalPotential: 0,
        avgPrice:       r.avg_price_nzd_mwh,
        niPrice:        r.ni_avg_price,
        siPrice:        r.si_avg_price,
        maxPrice:       r.max_price_nzd_mwh,
      };
    }
    byTimestamp[ts].totalShortfall  += (r.total_shortfall_mw || 0);
    byTimestamp[ts].totalForecast   += (r.total_cleared_mw   || 0);
    byTimestamp[ts].totalPotential  += (r.total_cleared_mw   || 0);
  });

  const sorted    = Object.values(byTimestamp).sort((a, b) => a.ts.localeCompare(b.ts));
  const x         = sorted.map(r => r.ts);
  const shortfall = sorted.map(r => r.totalShortfall);
  const avgPrice  = sorted.map(r => r.avgPrice);
  const niPrice   = sorted.map(r => r.niPrice);
  const siPrice   = sorted.map(r => r.siPrice);
  const maxPrice  = sorted.map(r => r.maxPrice);

  // ── Update badge ─────────────────────────────────────────
  const latest  = sorted[sorted.length - 1];
  const badgeEl = document.getElementById('gen-price-badge-text');
  const dotEl   = document.getElementById('gen-price-dot');
  if (badgeEl && latest) {
    const price = latest.avgPrice;
    badgeEl.textContent = price != null
      ? `Avg $${price.toFixed(2)}/MWh · Shortfall ${latest.totalShortfall?.toFixed(0) ?? '--'} MW`
      : 'Price data building up';
    if (dotEl) {
      const isHigh = price != null && price > 150;
      dotEl.style.background = isHigh ? '#ef4444' : '#14b8a6';
      dotEl.style.boxShadow  = isHigh
        ? '0 0 6px rgba(239,68,68,0.6)' : '0 0 6px rgba(20,184,166,0.6)';
    }
  }

  const traces = [
    {
      type: 'scatter', mode: 'lines',
      name: 'Shortfall MW', x, y: shortfall, yaxis: 'y',
      fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.08)',
      line: { color: 'rgba(239,68,68,0.7)', width: 2, shape: 'spline', smoothing: 0.6 },
      hovertemplate: '<b>Shortfall</b>: %{y:.1f} MW<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'Avg Price', x, y: avgPrice, yaxis: 'y2',
      line: { color: '#14b8a6', width: 2.5, shape: 'spline', smoothing: 0.6 },
      connectgaps: true,
      hovertemplate: '<b>Avg Price</b>: $%{y:.2f}/MWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'NI Avg', x, y: niPrice, yaxis: 'y2',
      line: { color: '#3b82f6', width: 1.5, dash: 'dot', shape: 'spline', smoothing: 0.6 },
      connectgaps: true,
      opacity: 0.8,
      hovertemplate: '<b>NI Avg</b>: $%{y:.2f}/MWh<extra></extra>',
    },
    {
      type: 'scatter', mode: 'lines',
      name: 'SI Avg', x, y: siPrice, yaxis: 'y2',
      line: { color: '#10b981', width: 1.5, dash: 'dot', shape: 'spline', smoothing: 0.6 },
      connectgaps: true,
      opacity: 0.8,
      hovertemplate: '<b>SI Avg</b>: $%{y:.2f}/MWh<extra></extra>',
    },
  ];

  const layout = {
    ...CHART_BASE_LAYOUT,
    margin: { t: 12, r: 52, b: 64, l: 52 },
    xaxis: {
      ...CHART_BASE_LAYOUT.xaxis,
      type:        'date',
      dtick:       12 * 3600 * 1000,
      tickformat:  '%d %b\n%H:%M',
      hoverformat: '%d %b %H:%M NZST',
    },
    yaxis: {
      ...CHART_BASE_LAYOUT.yaxis,
      tickprefix: '', ticksuffix: ' MW',
      title: { text: 'Shortfall MW', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    yaxis2: {
      overlaying: 'y', side: 'right',
      gridcolor:  'rgba(255,255,255,0.0)', zeroline: false,
      tickfont:   { size: 10, color: '#4a6a7a' }, tickprefix: '$',
      title: { text: '$/MWh', font: { size: 10, color: '#4a6a7a' }, standoff: 6 },
    },
    legend: { ...CHART_BASE_LAYOUT.legend, y: -0.32 },
  };

  animatedPlot(containerId, traces, layout, 200);
  watchResize(containerId);
}

/* ============================================================
   Generation Insights — Sequential scan line animation
   Runs left → right across each panel in sequence
   Panel 1 → Panel 2 → Panel 3, then loops every 12s
   ============================================================ */

function initGenPanelScanLines() {
  const panelIds = ['panel-gen-carbon', 'panel-gen-spread', 'panel-gen-price'];
  const SCAN_DURATION  = 4000;  // ms per panel scan
  const SCAN_GAP       = 600;   // ms between panels
  const LOOP_INTERVAL  = 18000; // ms between full cycles

  // Inject scan line into each panel
  panelIds.forEach(id => {
    const panel = document.getElementById(id);
    if (!panel) return;

    // Make sure panel has position:relative
    panel.style.position = 'relative';
    panel.style.overflow = 'hidden';

    // Create scan line element
    const scan = document.createElement('div');
    scan.className = `gen-scan-line`;
    scan.dataset.panel = id;
    scan.style.cssText = `
      position: absolute;
      top: 0;
      left: -40%;
      width: 40%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(20, 184, 166, 0.04) 20%,
        rgba(20, 184, 166, 0.08) 50%,
        rgba(20, 184, 166, 0.04) 80%,
        transparent 100%
      );
      pointer-events: none;
      z-index: 10;
      opacity: 0;
      border-radius: inherit;
    `;
    panel.appendChild(scan);
  });

  // Run one scan across a single panel
  function scanPanel(panelId) {
    return new Promise(resolve => {
      const panel = document.getElementById(panelId);
      if (!panel) { resolve(); return; }

      const scan = panel.querySelector('.gen-scan-line');
      if (!scan) { resolve(); return; }

      // Reset position
      scan.style.transition = 'none';
      scan.style.left       = '-40%';
      scan.style.opacity    = '0';

      // Force reflow
      scan.getBoundingClientRect();

      // Animate across
      scan.style.transition = `left ${SCAN_DURATION}ms ease-in-out,
                                opacity 400ms ease`;
      scan.style.opacity    = '1';
      scan.style.left       = '140%';

      // Fade out near end
      setTimeout(() => {
        scan.style.opacity = '0';
      }, SCAN_DURATION - 600);

      setTimeout(resolve, SCAN_DURATION);
    });
  }

  // Run sequence: panel 1 → gap → panel 2 → gap → panel 3
  async function runSequence() {
    for (let i = 0; i < panelIds.length; i++) {
      await scanPanel(panelIds[i]);
      if (i < panelIds.length - 1) {
        await new Promise(r => setTimeout(r, SCAN_GAP));
      }
    }
  }

  // Start after a short delay, then loop
  setTimeout(() => {
    runSequence();
    setInterval(runSequence, LOOP_INTERVAL);
  }, 2000);
}


window.initGenPanelScanLines = initGenPanelScanLines;
window.renderPrice24Chart   = renderPrice24Chart;
window.renderSummaryChart   = renderSummaryChart;
window.renderTrendChart     = renderTrendChart;
window.renderSpreadChart    = renderSpreadChart;
window.renderGenCarbonChart = renderGenCarbonChart;
window.renderGenSpreadChart = renderGenSpreadChart;
window.renderGenPriceChart  = renderGenPriceChart;
window.initChartAnimations  = initChartAnimations;

