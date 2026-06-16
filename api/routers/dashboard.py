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
from api.routers.generation import (
    get_shortfall_carbon,
    get_island_spread,
    get_shortfall_price,
)

router = APIRouter()

CACHE = {
    "live":  {"timestamp": 0, "data": None},
    "daily": {"timestamp": 0, "data": None},
}

LIVE_TTL  = 2 * 60   
DAILY_TTL = 5 * 60   


@router.get("/dashboard")
def get_dashboard():
    now = time.time()

    if (
        CACHE["live"]["data"] is None
        or now - CACHE["live"]["timestamp"] >= LIVE_TTL
    ):
        CACHE["live"]["data"] = {
            "priceRegions": get_regional_prices(),
            "carbon":       get_carbon_latest(),   
        }
        CACHE["live"]["timestamp"] = now

    if (
        CACHE["daily"]["data"] is None
        or now - CACHE["daily"]["timestamp"] >= DAILY_TTL
    ):
        CACHE["daily"]["data"] = {
            "reserves":          get_reserves_latest(),
            "spread":            get_spread_latest(),
            "priceNodes":        get_node_prices(hours=48),
            "carbonTrend":       get_carbon_trend(hours=192),
            "spreadTrend":       get_spread_trend(hours=48),
            "priceSummary":      get_daily_summary(days=30),
            "genShortfallCarbon":get_shortfall_carbon(hours=48),
            "genIslandSpread":   get_island_spread(hours=48),
            "genShortfallPrice": get_shortfall_price(hours=48),
        }
        CACHE["daily"]["timestamp"] = now

    return {**CACHE["daily"]["data"], **CACHE["live"]["data"]}