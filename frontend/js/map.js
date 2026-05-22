/* ============================================================
   js/map.js
   NZ SVG price map: base map + dots + lines + labels
   Everything is drawn inside one SVG to avoid responsive drift.
============================================================ */

const NZ_PRICE_MAP = {
  viewBoxWidth: 620,
  viewBoxHeight: 700,
  svgPath: "assets/nz.svg",

  mapFit: {
    widthRatio: 0.68,
    heightRatio: 0.88,
    offsetX: -355,
    offsetY: 0,
  },
};

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

  if (lineGroup) lineGroup.innerHTML = "";
  if (dotGroup) dotGroup.innerHTML = "";
  if (labelGroup) labelGroup.innerHTML = "";
  if (debugGroup) debugGroup.innerHTML = "";
}

function renderRegionDotsOnly() {
  clearMapOverlays();

  const dotGroup = document.getElementById("nz-map-dots");
  if (!dotGroup) return;

  REGION_DOT_POINTS.forEach((region) => {
    if (!region.showDot) return;

    const dot = createSvgElement("circle", {
      cx: region.x,
      cy: region.y,
      r: 5.5,
      fill: "#7EF9E7",
      stroke: "#ffffff",
      "stroke-width": 1.4,
      class: "nz-map-dot",
    });

    dotGroup.appendChild(dot);
  });
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


function getLatestPriceByNode(priceData) {
  const map = new Map();

  if (!Array.isArray(priceData)) return map;

  priceData.forEach((item) => {
    const nodeId =
      item.node_id ||
      item.nodeId ||
      item.node ||
      item.id ||
      item.location_id;

    if (!nodeId) return;

    const existing = map.get(nodeId);

    if (!existing) {
      map.set(nodeId, item);
      return;
    }

    const currentTime = item.timestamp_nzt || item.timestamp || "";
    const existingTime = existing.timestamp_nzt || existing.timestamp || "";

    if (String(currentTime) > String(existingTime)) {
      map.set(nodeId, item);
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

function drawConnectorLine(group, node) {
  const labelWidth = 112;
  const labelHeight = 40;

  let x2;
  let y2;

  if (node.lineAttach === "bottom") {
    x2 = node.labelX + labelWidth / 2;
    y2 = node.labelY + labelHeight;
  } else {
    x2 = node.anchor === "left"
      ? node.labelX + labelWidth
      : node.labelX;

    y2 = node.labelY + labelHeight / 2;
  }

  const line = createSvgElement("line", {
    x1: node.x,
    y1: node.y,
    x2,
    y2,
    class: "nz-map-line",
  });

  group.appendChild(line);
}

function drawPriceDot(group, node, price) {
  const dot = createSvgElement("circle", {
    cx: node.x,
    cy: node.y,
    r: 5.8,
    fill: getPriceColor(price),
    class: "nz-map-dot",
  });

  group.appendChild(dot);
}

function drawPriceLabel(group, node, price) {
  const labelWidth = 112;
  const labelHeight = 40;
  const boxX = node.labelX;
  const boxY = node.labelY;

  const label = createSvgElement("g", {
    class: "nz-map-label",
  });

  const rect = createSvgElement("rect", {
    x: boxX,
    y: boxY,
    width: labelWidth,
    height: labelHeight,
    rx: 8,
    ry: 8,
    class: "nz-map-label-box",
  });

  const name = createSvgElement("text", {
    x: boxX + 10,
    y: boxY + 16,
    class: "nz-map-label-name",
  });
  name.textContent = node.displayName || node.name;

  const value = createSvgElement("text", {
    x: boxX + 10,
    y: boxY + 32,
    class: "nz-map-label-price",
  });

  value.textContent = Number.isFinite(price)
    ? `$${price.toFixed(2)}/MWh`
    : "No data";

  label.appendChild(rect);
  label.appendChild(name);
  label.appendChild(value);

  group.appendChild(label);
}

function getPriceColor(price) {
  if (!Number.isFinite(price)) return "#64748b";

  if (price < 80) return "#22c55e";
  if (price < 150) return "#14b8a6";
  if (price < 250) return "#f59e0b";

  return "#ef4444";
}

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);

  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}


function enableMapCoordinateDebug() {
  const svg = document.getElementById("nz-price-map");
  const debugGroup = document.getElementById("nz-map-debug");

  if (!svg || !debugGroup) return;

  svg.addEventListener("click", function (event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    const x = Number(svgPoint.x.toFixed(1));
    const y = Number(svgPoint.y.toFixed(1));

    console.log(`SVG coordinate: x=${x}, y=${y}`);

    drawDebugMarker(debugGroup, x, y);
  });

  console.log("✅ Map coordinate debug enabled. Click map to get SVG x/y.");
}

function drawDebugMarker(group, x, y) {
  group.innerHTML = "";

  const circle = createSvgElement("circle", {
    cx: x,
    cy: y,
    r: 6,
    fill: "#ff4d4f",
    stroke: "#ffffff",
    "stroke-width": 1.5
  });

  const text = createSvgElement("text", {
    x: x + 10,
    y: y - 10,
    fill: "#ffffff",
    "font-size": 11,
    "font-family": "monospace"
  });

  text.textContent = `(${x}, ${y})`;

  group.appendChild(circle);
  group.appendChild(text);
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