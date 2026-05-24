/* ============================================================
   js/api.js
   All fetch calls to your FastAPI backend.
   One function per endpoint — mirrors Python routers exactly.
   
   Every function returns the parsed JSON or throws an error.
   dashboard.js calls these and handles the UI updates.
============================================================ */
const CACHE_TTL = {
  carbon: 5 * 60 * 1000,        // 5 minutes
  priceRegions: 5 * 60 * 1000,  // 5 minutes
  priceNodes: 5 * 60 * 1000,    // 5 minutes
  priceSummary: 10 * 60 * 1000, // 10 minutes
  carbonTrend: 15 * 60 * 1000,  // 15 minutes
  spreadTrend: 15 * 60 * 1000,  // 15 minutes
  reserves: 5 * 60 * 1000,
  spreadLatest: 5 * 60 * 1000,
  dashboard: 5 * 60 * 1000,
};

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw);

    if (!cached.timestamp || cached.data === undefined) {
      return null;
    }

    return cached;
  } catch (error) {
    console.warn(`Cache read failed for ${key}`, error);
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch (error) {
    console.warn(`Cache write failed for ${key}`, error);
  }
}

function isCacheFresh(cached, ttlMs) {
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttlMs;
}

async function fetchWithCache(cacheKey, url, ttlMs) {
  const cached = getCache(cacheKey);

  if (isCacheFresh(cached, ttlMs)) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return cached.data;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${url}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);

    console.log(`🔄 Fresh API loaded: ${cacheKey}`);
    return data;
  } catch (error) {
    console.warn(`⚠️ Fresh API failed for ${cacheKey}. Trying stale cache.`, error);

    if (cached && cached.data !== undefined) {
      console.log(`🟡 Using stale cache: ${cacheKey}`);
      return cached.data;
    }

    throw error;
  }
}

const API = {
  async getCarbonLatest() {
    return fetchWithCache(
      "cache_carbon_latest",
      `${CONFIG.API_BASE}/api/carbon/latest`,
      CACHE_TTL.carbon
    );
  },

  async getCarbonTrend(hours = 192) {
    return fetchWithCache(
      `cache_carbon_trend_${hours}`,
      `${CONFIG.API_BASE}/api/carbon/trend?hours=${hours}`,
      CACHE_TTL.carbonTrend
    );
  },

  async getPriceNodes(hours = 48) {
    return fetchWithCache(
      `cache_price_nodes_${hours}`,
      `${CONFIG.API_BASE}/api/prices/nodes?hours=${hours}`,
      CACHE_TTL.priceNodes
    );
  },

  async getPriceRegions() {
    return fetchWithCache(
      "cache_price_regions",
      `${CONFIG.API_BASE}/api/prices/regions`,
      CACHE_TTL.priceRegions
    );
  },

  async getReservesLatest() {
    return fetchWithCache(
      "cache_reserves_latest",
      `${CONFIG.API_BASE}/api/reserves/latest`,
      CACHE_TTL.reserves
    );
  },

  async getSpreadLatest() {
    return fetchWithCache(
      "cache_spread_latest",
      `${CONFIG.API_BASE}/api/spread/latest`,
      CACHE_TTL.spreadLatest
    );
  },

  async getSpreadTrend(hours = 48) {
    return fetchWithCache(
      `cache_spread_trend_${hours}`,
      `${CONFIG.API_BASE}/api/spread/trend?hours=${hours}`,
      CACHE_TTL.spreadTrend
    );
  },

  async getPriceSummary(days = 30) {
    return fetchWithCache(
      `cache_price_summary_${days}`,
      `${CONFIG.API_BASE}/api/prices/summary?days=${days}`,
      CACHE_TTL.priceSummary
    );
  },

  async fetchAll() {
    return fetchWithCache(
      "cache_dashboard_all",
      `${CONFIG.API_BASE}/api/dashboard`,
      CACHE_TTL.dashboard
    );
  },

  async fetchLive() {
    const [carbon, reserves, spread] = await Promise.allSettled([
      this.getCarbonLatest(),
      this.getReservesLatest(),
      this.getSpreadLatest(),
    ]);

    return {
      carbon: carbon.status === "fulfilled" ? carbon.value : null,
      reserves: reserves.status === "fulfilled" ? reserves.value : null,
      spread: spread.status === "fulfilled" ? spread.value : null,
    };
  },
};
