# ============================================================
# api/routers/carbon.py
# Endpoints:
#   GET /api/carbon/latest:  live carbon + renewable metrics
#   GET /api/carbon/trend: last 7 days carbon trend
# ============================================================

from fastapi import APIRouter, HTTPException
from api.database import query_one, query_many
from api.models import CarbonLatest, CarbonTrendPoint

router = APIRouter()

@router.get("/carbon/latest", response_model=CarbonLatest)
def get_carbon_latest():
    """
    Latest carbon intensity and renewable metrics.
    Reads from raw carbon_intensity table — updated every 30 min by fast_ingest.
    Powers: renewable gauge, carbon KPI card, grid status panel.
    """

    result = query_one("""
        SELECT
            timestamp                           AS timestamp_utc,
            timestamp AT TIME ZONE 'Pacific/Auckland'
                                                AS timestamp_nzt,
            trading_period,
            CONCAT('TP', trading_period)        AS period_label,
            nz_carbon_gkwh,
            nz_carbon_change_gkwh,
            nz_carbon_t,
            nz_renewable                        AS renewable_pct,
            CASE
                WHEN nz_renewable >= 0.80 THEN 'Very Clean'
                WHEN nz_renewable >= 0.60 THEN 'Clean'
                WHEN nz_renewable >= 0.40 THEN 'Moderate'
                ELSE 'Dirty'
            END                                 AS grid_status,
            CASE
                WHEN nz_carbon_gkwh < 50  THEN 'Very Low'
                WHEN nz_carbon_gkwh < 80  THEN 'Low'
                WHEN nz_carbon_gkwh < 110 THEN 'Moderate'
                WHEN nz_carbon_gkwh < 130 THEN 'High'
                ELSE 'Very High'
            END                                 AS carbon_status,
            CASE
                WHEN nz_carbon_change_gkwh < -1 THEN 'Improving'
                WHEN nz_carbon_change_gkwh >  1 THEN 'Worsening'
                ELSE 'Stable'
            END                                 AS carbon_trend,
            ROUND(
                (nz_carbon_gkwh - current_month_avg_gkwh)
                / NULLIF(current_month_avg_gkwh, 0) * 100,
                1
            )                                   AS vs_month_avg_pct,
            max_24hrs_gkwh,
            min_24hrs_gkwh,
            current_month_avg_gkwh,
            current_year_avg_gkwh,
            pct_current_year_gkwh,
            NULL                                AS position_in_24hr_range
        FROM carbon_intensity
        ORDER BY timestamp DESC
        LIMIT 1
    """)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="No carbon intensity data available"
        )

    return result 

@router.get("/carbon/trend", response_model=list[CarbonTrendPoint])
def get_carbon_trend(hours: int = 168):
    """
    Carbon intensity trend for the last N hours (default 7 days).
    Powers: carbon intensity line chart.
    """

    results = query_many("""
        SELECT
            timestamp_utc,
            timestamp_nzt,
            trading_period,
            nz_carbon_gkwh,
            renewable_pct,
            carbon_status,
            grid_status
        FROM marts.mart_carbon_intensity
        WHERE timestamp_utc > NOW() - INTERVAL '1 hour' * %s
        ORDER BY timestamp_utc ASC
    """, (hours,))

    return results 

