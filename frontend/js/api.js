/* ============================================================
   js/api.js
   All fetch calls to your FastAPI backend.
   One function per endpoint — mirrors Python routers exactly.
   
   Every function returns the parsed JSON or throws an error.
   dashboard.js calls these and handles the UI updates.
============================================================ */

const API = {
    async _get(endpoint) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const res = await fetch(url, {
        method:  "GET",
        headers: { "Accept": "application/json" },
        });
        if (!res.ok) {
        throw new Error(`API ${endpoint} returned ${res.status}`);
        }
        return res.json();
    },

    async getCarbonLatest() {
        return this._get("/api/carbon/latest");
    },

    async getCarbonTrend(hours=192){
        return this._get(`/api/carbon/trend?hours=${hours}`);
    },

    async getPriceNodes(hours = 48) {
        return this._get(`/api/prices/nodes?hours=${hours}`);
    },

    async getPriceRegions() {
        return this._get("/api/prices/regions");
    },

    async getReservesLatest() {
        return this._get("/api/reserves/latest");
    },

    async getSpreadLatest() {
        return this._get("/api/spread/latest");
    },

    async getSpreadTrend(hours = 48) {
        return this._get(`/api/spread/trend?hours=${hours}`);
    },

    async getPriceSummary(days = 30) {
        return this._get(`/api/prices/summary?days=${days}`);
    },

    async fetchAll() {
        const [
            carbon,
            reserves,
            spread,
            priceNodes,
            priceRegions,
            carbonTrend,
            spreadTrend,
            priceSummary,
            ] = await Promise.allSettled([
            this.getCarbonLatest(),
            this.getReservesLatest(),
            this.getSpreadLatest(),
            this.getPriceNodes(48),
            this.getPriceRegions(),
            this.getCarbonTrend(192),
            this.getSpreadTrend(48),
            this.getPriceSummary(30),
        ]);

        const extract = r => r.status === "fulfilled" ? r.value : null;

        return {
            carbon:       extract(carbon),
            reserves:     extract(reserves),
            spread:       extract(spread),
            priceNodes:   extract(priceNodes),
            priceRegions: extract(priceRegions),
            carbonTrend:  extract(carbonTrend),
            spreadTrend:  extract(spreadTrend),
            priceSummary: extract(priceSummary),
        };
    },

    async fetchLive() {
        const [carbon, reserves, spread] = await Promise.allSettled([
            this.getCarbonLatest(),
            this.getReservesLatest(),
            this.getSpreadLatest(),
        ]);
        return {
            carbon: carbon.status == "fulfilled" ? carbon.value   : null,
            reserves: reserves.status === "fulfilled" ? reserves.value : null,
            spread: spread.status   === "fulfilled" ? spread.value   : null,
        };
    },
};
