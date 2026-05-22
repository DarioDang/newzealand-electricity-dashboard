/* ============================================================
   js/map.js
   NZ SVG price map: base map + dots + lines + labels
   Everything is drawn inside one SVG to avoid responsive drift.
============================================================ */

const NZ_PRICE_MAP = {
  svgPath: "assets/nz.svg",
};

const PRICE_BANDS = [
  { label: "< $100", min: -Infinity, max: 100, color: "#8b5cf6" },
  { label: "$100 - $200", min: 100, max: 200, color: "#99f6e4" },
  { label: "$200 - $300", min: 200, max: 300, color: "#14b8a6" },
  { label: "$300 - $400", min: 300, max: 400, color: "#facc15" },
  { label: "$400 - $500", min: 400, max: 500, color: "#f97316" },
  { label: "> $500", min: 500, max: Infinity, color: "#e11d48" },
];

const REGION_DOT_POINTS = [
  {
    id: 1,
    name: "Northland",
    x: 275.0,
    y: 75.4,
    labelX: 95,
    labelY: 55,
    anchor: "left",
    show: true,
  },
  {
    id: 2,
    name: "Auckland",
    x: 315.6,
    y: 141,
    labelX: 375,
    labelY: 15,
    anchor: "right",
    show: true,
  },
  {
    id: 3,
    name: "Hamilton",
    x: 334.6,
    y: 180.4,
    labelX: 95,
    labelY: 165,
    anchor: "left",
    show: true,
  },
  {
    id: 4,
    name: "Edgecumbe",
    x: 397.3,
    y: 200.8,
    labelX: 370,
    labelY: 80,
    anchor: "right",
    lineAttach: "bottom",
    show: true,
  },
  {
    id: 5,
    name: "Rotorua",
    x: 0,
    y: 0,
    show: false,
  },
  {
    id: 6,
    name: "Hawkes Bay",
    x: 406,
    y: 275.2,
    labelX: 430,
    labelY: 290,
    anchor: "right",
    show: true,
  },
  {
    id: 7,
    name: "Bunnythorpe",
    x: 365.9,
    y: 326.2,
    labelX: 125,
    labelY: 275,
    anchor: "left",
    show: true,
  },
  {
    id: 8,
    name: "Wellington",
    x: 321.5,
    y: 372.9,
    labelX: 345,
    labelY: 395,
    anchor: "right",
    show: true,
  },
  {
    id: 9,
    name: "Nelson",
    x: 257.3,
    y: 378.7,
    labelX: 80,
    labelY: 350,
    anchor: "left",
    show: true,
  },
  {
    id: 10,
    name: "Christchurch",
    x: 241.2,
    y: 493.9,
    labelX: 325,
    labelY: 480,
    anchor: "right",
    show: true,
  },
  {
    id: 11,
    name: "Canterbury",
    x: 166.9,
    y: 521.7,
    labelX: 1,
    labelY: 410,
    anchor: "left",
    lineAttach: "bottom",
    show: true,
  },
  {
    id: 12,
    name: "Waitaki",
    x: 0,
    y: 0,
    show: false,
  },
  {
    id: 13,
    name: "Otago",
    x: 123.1,
    y: 578.5,
    labelX: 235,
    labelY: 565,
    anchor: "right",
    show: true,
  },
  {
    id: 14,
    name: "Invercargill",
    displayName: "Southland",
    x: 69.2,
    y: 634,
    labelX: 170,
    labelY: 650,
    anchor: "right",
    lineAttachY: 22,
    show: true,
  },
];

function clearMapOverlays() {
  const lineGroup = document.getElementById("nz-map-lines");
  const dotGroup = document.getElementById("nz-map-dots");
  const labelGroup = document.getElementById("nz-map-labels");
  const debugGroup = document.getElementById("nz-map-debug");
  const legendGroup = document.getElementById("nz-map-legend");

  if (lineGroup) lineGroup.innerHTML = "";
  if (dotGroup) dotGroup.innerHTML = "";
  if (labelGroup) labelGroup.innerHTML = "";
  if (debugGroup) debugGroup.innerHTML = "";
  if (legendGroup) legendGroup.innerHTML = "";
}

async function initNZPriceMap() {
  await loadNZMapSvg();
  clearMapOverlays();

  console.log("✅ NZ map loaded");
}

async function loadNZMapSvg() {
  const baseGroup = document.getElementById("nz-map-base");
  if (!baseGroup) return;

  try {
    const response = await fetch(NZ_PRICE_MAP.svgPath);

    if (!response.ok) {
      throw new Error(`Failed to load ${NZ_PRICE_MAP.svgPath}`);
    }

    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const sourceSvg = svgDoc.querySelector("svg");

    if (!sourceSvg) {
      throw new Error("Invalid NZ SVG file");
    }

    baseGroup.innerHTML = "";

    Array.from(sourceSvg.children).forEach((child) => {
      const imported = document.importNode(child, true);
      applyMapClass(imported);
      baseGroup.appendChild(imported);
    });

    fitMapToViewBox(baseGroup);
  } catch (error) {
    console.error("[NZ Map] Load failed:", error);

    baseGroup.innerHTML = `
      <text x="250" y="350" class="nz-map-empty">
        NZ map could not be loaded
      </text>
    `;
  }
}

function applyMapClass(element) {
  if (!element || !element.tagName) return;

  const tag = element.tagName.toLowerCase();

  if (tag === "path" || tag === "polygon" || tag === "polyline") {
    element.classList.add("nz-region-path");
    element.removeAttribute("fill");
    element.removeAttribute("stroke");
    element.removeAttribute("stroke-width");
  }

  Array.from(element.children || []).forEach(applyMapClass);
}

function fitMapToViewBox(baseGroup) {
  baseGroup.setAttribute(
    "transform",
    "translate(-40, 2) scale(0.55)"
  );

  console.log("[NZ Map] manual transform applied");
}

function renderNZPriceMap(regionData = []) {
  clearMapOverlays();

  const overlayGroup = document.getElementById("nz-map-labels");
  if (!overlayGroup) return;

  const priceByRegion = getPriceByRegion(regionData);

  REGION_DOT_POINTS.forEach((region) => {
    if (!region.show) return;

    const item =
      priceByRegion.get(String(region.id)) ||
      priceByRegion.get(region.name);

    const price = getPriceValue(item);

    drawRegionGroup(overlayGroup, region, price);
  });

  renderMapLegend();
}

function getPriceByRegion(regionData) {
  const map = new Map();

  if (!Array.isArray(regionData)) return map;

  regionData.forEach((item) => {
    if (item.grid_zone_id !== undefined && item.grid_zone_id !== null) {
      map.set(String(item.grid_zone_id), item);
    }

    if (item.grid_zone_name) {
      map.set(item.grid_zone_name, item);
    }
  });

  return map;
}

function getPriceValue(item) {
  if (!item) return null;

  const value =
    item.price_nzd_mwh ??
    item.price ??
    item.avg_price ??
    item.value;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getPriceColor(price) {
  if (!Number.isFinite(price)) return "#64748b";

  const band = PRICE_BANDS.find(
    (band) => price >= band.min && price < band.max
  );

  return band ? band.color : "#64748b";
}

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);

  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

function renderMapLegend() {
  const legendGroup = document.getElementById("nz-map-legend");
  if (!legendGroup) return;

  legendGroup.innerHTML = "";

  const legendX = 485;
  const legendY = 500;
  const itemHeight = 28;
  const boxWidth = 145;
  const boxHeight = 205;

  const wrapper = createSvgElement("g", {
    class: "nz-map-legend-group",
    transform: `translate(${legendX}, ${legendY})`,
  });

  const background = createSvgElement("rect", {
    x: 0,
    y: 0,
    width: boxWidth,
    height: boxHeight,
    rx: 10,
    ry: 10,
    class: "nz-map-legend-bg",
  });

  const title = createSvgElement("text", {
    x: 14,
    y: 24,
    class: "nz-map-legend-title",
  });

  title.textContent = "Price Range";

  wrapper.appendChild(background);
  wrapper.appendChild(title);

  PRICE_BANDS.forEach((band, index) => {
    const y = 48 + index * itemHeight;

    const colorBox = createSvgElement("rect", {
      x: 14,
      y: y - 11,
      width: 16,
      height: 16,
      rx: 3,
      ry: 3,
      fill: band.color,
      class: "nz-map-legend-color",
    });

    const legendLabel = createSvgElement("text", {
      x: 38,
      y: y + 1,
      class: "nz-map-legend-label",
    });

    legendLabel.textContent = band.label;

    wrapper.appendChild(colorBox);
    wrapper.appendChild(legendLabel);
  });

  legendGroup.appendChild(wrapper);
}

function drawRegionGroup(parentGroup, region, price) {
  if (!region.show) return;

  const labelWidth = 112;
  const labelHeight = 40;

  const regionGroup = createSvgElement("g", {
    class: "nz-region-price-group",
    "data-region": region.name,
  });

  let lineEndX;
  let lineEndY;

  if (region.lineAttach === "bottom") {
   lineEndX = region.labelX + (region.lineAttachX ?? labelWidth / 2);
   lineEndY = region.labelY + labelHeight;
  } else {
    lineEndX =
      region.anchor === "left"
        ? region.labelX + labelWidth
        : region.labelX;

    lineEndY = region.labelY + (region.lineAttachY ?? labelHeight / 2);
  }

  const line = createSvgElement("line", {
    x1: region.x,
    y1: region.y,
    x2: lineEndX,
    y2: lineEndY,
    class: "nz-map-line",
  });

  const pulse = createSvgElement("circle", {
    cx: region.x,
    cy: region.y,
    r: 5.5,
    fill: "none",
    class: "nz-map-dot-pulse",
    });

  const dot = createSvgElement("circle", {
    cx: region.x,
    cy: region.y,
    r: 5.5,
    fill: getPriceColor(price),
    stroke: "#ffffff",
    "stroke-width": 1.4,
    class: "nz-map-dot",
    });

  const labelGroup = createSvgElement("g", {
    class: "nz-map-label-group",
    transform: `translate(${region.labelX}, ${region.labelY})`,
  });

  const rect = createSvgElement("rect", {
    x: 0,
    y: 0,
    width: labelWidth,
    height: labelHeight,
    rx: 8,
    ry: 8,
    class: "nz-map-label-box",
  });

  const nameText = createSvgElement("text", {
    x: labelWidth / 2,
    y: 16,
    class: "nz-map-label-name",
    "text-anchor": "middle",
    });

    nameText.textContent = region.displayName || region.name;

    const priceText = createSvgElement("text", {
    x: labelWidth / 2,
    y: 32,
    class: "nz-map-label-price",
    "text-anchor": "middle",
    });

    priceText.textContent = Number.isFinite(price)
    ? `$${price.toFixed(2)}`
    : "No data";

  labelGroup.appendChild(rect);
  labelGroup.appendChild(nameText);
  labelGroup.appendChild(priceText);

  regionGroup.appendChild(line);
  regionGroup.appendChild(pulse);
  regionGroup.appendChild(dot);
  regionGroup.appendChild(labelGroup);

  parentGroup.appendChild(regionGroup);
}

window.initNZPriceMap = initNZPriceMap;
window.renderNZPriceMap = renderNZPriceMap;