@router.get("/prices/regions", response_model = list[RegionalPrice])
def get_regional_prices():
    """
    Current spot price for all 14 NZ grid regions.
    Powers: NZ Regional price map.

    Reads directly from public.regional_prices (raw table, fed every 30 min
    by the reliable cron-job.org → Railway ingest path) instead of the
    staging.stg_em6__regional_prices dbt view, which only refreshes once
    nightly via rollup.yml — that lag was causing the dashboard to show
    stale "last updated" times even when raw data was current.
    """

    results = query_many("""
        SELECT
            rp.timestamp AS timestamp_utc,
            rp.trading_period,
            rp.grid_zone_id,
            gz.grid_zone_name,
            gz.island,
            rp.price AS price_nzd_mwh
        FROM public.regional_prices rp
        JOIN public.grid_zones gz USING (grid_zone_id)
        WHERE rp.timestamp = (
            SELECT MAX(timestamp)
            FROM public.regional_prices
        )
        ORDER BY gz.island DESC, gz.grid_zone_name
    """)

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No regional price data available"
        )

    return results