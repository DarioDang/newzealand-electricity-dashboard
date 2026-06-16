from fastapi import APIRouter, HTTPException
from api.database import query_many
from api.models import (
    GenerationShortfallCarbon,
    GenerationIslandSpread,
    GenerationShortfallPrice,
)

router = APIRouter()


@router.get("/generation/shortfall-carbon", response_model=list[GenerationShortfallCarbon])
def get_shortfall_carbon(hours: int = 48):
    results = query_many("""
        SELECT
            gf.timestamp                                        AS timestamp_utc,
            to_char(
                gf.timestamp AT TIME ZONE 'Pacific/Auckland',
                'YYYY-MM-DD"T"HH24:MI:SS'
            )                                                   AS timestamp_nzt,
            gf.trading_period,
            gf.region,
            gf.generation_type,
            CASE gf.generation_type
                WHEN 'WIN' THEN 'Wind'
                WHEN 'SOL' THEN 'Solar'
            END                                                 AS generation_label,
            gf.forecast_mw,
            gf.potential_forecast_mw,
            ROUND(
                (gf.potential_forecast_mw - gf.forecast_mw)::numeric
            , 2)                                                AS shortfall_mw,
            CASE
                WHEN gf.potential_forecast_mw > 0
                THEN ROUND(
                    (gf.forecast_mw / gf.potential_forecast_mw * 100)::numeric
                , 2)
            END                                                 AS forecast_accuracy_pct,
            ci.nz_carbon_gkwh,
            ci.nz_renewable                                     AS renewable_pct
        FROM public.generation_forecast gf
        LEFT JOIN public.carbon_intensity ci
            ON ci.timestamp = DATE_TRUNC('hour', gf.timestamp)
        WHERE gf.timestamp > NOW() - make_interval(hours => %s)
          AND gf.region    = 'NZ'
        ORDER BY gf.timestamp ASC, gf.generation_type
    """, (hours,))

    if not results:
        raise HTTPException(status_code=404, detail="No generation forecast data available")

    return results


@router.get("/generation/island-spread", response_model=list[GenerationIslandSpread])
def get_island_spread(hours: int = 48):
    results = query_many("""
        WITH ni AS (
            SELECT
                timestamp,
                trading_period,
                generation_type,
                CASE generation_type
                    WHEN 'WIN' THEN 'Wind'
                    WHEN 'SOL' THEN 'Solar'
                END                         AS generation_label,
                forecast_mw                 AS ni_forecast_mw,
                potential_forecast_mw       AS ni_potential_mw,
                ROUND(
                    (potential_forecast_mw - forecast_mw)::numeric
                , 2)                        AS ni_shortfall_mw
            FROM public.generation_forecast
            WHERE region    = 'NI'
              AND timestamp > NOW() - make_interval(hours => %s)
        ),
        si AS (
            SELECT
                timestamp,
                trading_period,
                generation_type,
                forecast_mw                 AS si_forecast_mw,
                potential_forecast_mw       AS si_potential_mw,
                ROUND(
                    (potential_forecast_mw - forecast_mw)::numeric
                , 2)                        AS si_shortfall_mw
            FROM public.generation_forecast
            WHERE region    = 'SI'
              AND timestamp > NOW() - make_interval(hours => %s)
        ),
        combined AS (
            SELECT
                ni.timestamp,
                ni.trading_period,
                ni.generation_type,
                ni.generation_label,
                ni.ni_forecast_mw,
                ni.ni_shortfall_mw,
                si.si_forecast_mw,
                si.si_shortfall_mw,
                ROUND(
                    (COALESCE(si.si_forecast_mw, 0)
                     - COALESCE(ni.ni_forecast_mw, 0))::numeric
                , 2)                        AS si_ni_imbalance_mw
            FROM ni
            LEFT JOIN si
                ON  si.timestamp       = ni.timestamp
                AND si.generation_type = ni.generation_type
        )
        SELECT
            c.timestamp                                         AS timestamp_utc,
            to_char(
                c.timestamp AT TIME ZONE 'Pacific/Auckland',
                'YYYY-MM-DD"T"HH24:MI:SS'
            )                                                   AS timestamp_nzt,
            c.trading_period,
            c.generation_type,
            c.generation_label,
            c.ni_forecast_mw,
            NULL::numeric                                       AS ni_cleared_mw,
            c.ni_shortfall_mw,
            c.si_forecast_mw,
            NULL::numeric                                       AS si_cleared_mw,
            c.si_shortfall_mw,
            c.si_ni_imbalance_mw,
            sp.ni_si_spread,
            sp.spread_direction,
            sp.spread_status
        FROM combined c
        LEFT JOIN marts.mart_ni_si_spread sp
            ON  sp.timestamp_utc = c.timestamp
        ORDER BY c.timestamp ASC, c.generation_type
    """, (hours, hours))

    if not results:
        raise HTTPException(status_code=404, detail="No island spread data available")

    return results


@router.get("/generation/shortfall-price", response_model=list[GenerationShortfallPrice])
def get_shortfall_price(hours: int = 48):
    results = query_many("""
        WITH gen AS (
            SELECT
                timestamp,
                trading_period,
                generation_type,
                CASE generation_type
                    WHEN 'WIN' THEN 'Wind'
                    WHEN 'SOL' THEN 'Solar'
                END                                 AS generation_label,
                SUM(forecast_mw)                    AS total_forecast_mw,
                SUM(potential_forecast_mw)          AS total_potential_mw,
                ROUND(
                    SUM(potential_forecast_mw - forecast_mw)::numeric
                , 2)                                AS total_shortfall_mw,
                CASE
                    WHEN SUM(potential_forecast_mw) > 0
                    THEN ROUND(
                        (SUM(forecast_mw)
                         / SUM(potential_forecast_mw) * 100)::numeric
                    , 2)
                END                                 AS forecast_accuracy_pct
            FROM public.generation_forecast
            WHERE region    = 'NZ'
              AND timestamp > NOW() - make_interval(hours => %s)
            GROUP BY timestamp, trading_period, generation_type
        ),
        prices AS (
            SELECT
                rp.timestamp,
                ROUND(AVG(rp.price)::numeric, 4)    AS avg_price_nzd_mwh,
                ROUND(MAX(rp.price)::numeric, 4)    AS max_price_nzd_mwh,
                ROUND(MIN(rp.price)::numeric, 4)    AS min_price_nzd_mwh,
                ROUND(AVG(
                    CASE WHEN gz.island = 'NI'
                    THEN rp.price END
                )::numeric, 4)                      AS ni_avg_price,
                ROUND(AVG(
                    CASE WHEN gz.island = 'SI'
                    THEN rp.price END
                )::numeric, 4)                      AS si_avg_price
            FROM public.regional_prices rp
            JOIN public.grid_zones gz USING (grid_zone_id)
            WHERE rp.timestamp > NOW() - make_interval(hours => %s)
            GROUP BY rp.timestamp
        )
        SELECT
            g.timestamp                                         AS timestamp_utc,
            to_char(
                g.timestamp AT TIME ZONE 'Pacific/Auckland',
                'YYYY-MM-DD"T"HH24:MI:SS'
            )                                                   AS timestamp_nzt,
            g.trading_period,
            g.generation_type,
            g.generation_label,
            g.total_shortfall_mw,
            g.total_forecast_mw                                 AS total_cleared_mw,
            g.forecast_accuracy_pct,
            p.avg_price_nzd_mwh,
            p.max_price_nzd_mwh,
            p.min_price_nzd_mwh,
            p.ni_avg_price,
            p.si_avg_price
        FROM gen g
        LEFT JOIN prices p
            ON p.timestamp = g.timestamp
        ORDER BY g.timestamp ASC, g.generation_type
    """, (hours, hours))

    if not results:
        raise HTTPException(status_code=404, detail="No shortfall price data available")

    return results