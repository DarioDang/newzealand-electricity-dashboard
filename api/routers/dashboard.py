# ============================================================
# api/routers/dashboard.py
# Endpoint:
#   GET /api/dashboard → combined dashboard payload
# ============================================================

import time
from fastapi import APIRouter

from api.routers.carbon import get_carbon_latest, get_carbon_trend
from api.routers.prices import (
    get_node_prices,
    get_regional_prices,
    get_daily_summary,
)
from api.routers.reserves import get_reserves_latest
from api.routers.spread import get_spread_latest, get_spread_trend

router = APIRouter()

DASHBOARD_CACHE = {
    "timestamp": 0,
    "data": None,
}

DASHBOARD_CACHE_TTL = 5 * 60  # 5 minutes


@router.get("/dashboard")
def get_dashboard():
    """
    Combined payload for the frontend dashboard.

    This reduces the initial frontend load from many API calls
    into one request:
      GET /api/dashboard
    """

    now = time.time()

    if (
        DASHBOARD_CACHE["data"] is not None
        and now - DASHBOARD_CACHE["timestamp"] < DASHBOARD_CACHE_TTL
    ):
        return DASHBOARD_CACHE["data"]

    data = {
        "carbon": get_carbon_latest(),
        "reserves": get_reserves_latest(),
        "spread": get_spread_latest(),
        "priceNodes": get_node_prices(hours=48),
        "priceRegions": get_regional_prices(),
        "carbonTrend": get_carbon_trend(hours=192),
        "spreadTrend": get_spread_trend(hours=48),
        "priceSummary": get_daily_summary(days=30),
    }

    DASHBOARD_CACHE["timestamp"] = now
    DASHBOARD_CACHE["data"] = data

    return data