# ============================================================
# pipeline/flows/ingest_regional_fast.py
# Responsibility: Fast 30-min ingest for live dashboard data
# - regional_prices        (map)
# - regional_prices_history (time series later)
# - carbon_intensity       (live KPI card)
# No dbt, no other endpoints — finishes in ~10 seconds
# ============================================================

import logging
import sys
import os
from datetime import datetime, timezone, timedelta

# Add pipeline root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extract import fetch_all
from transform import transform_all
from load import (
    get_connection,
    load_carbon_intensity,
    load_regional_prices,
    _upsert,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def is_data_fresh() -> bool:
    """
    Check if regional_prices already has data from last 28 min.
    Prevents duplicate inserts if both GitHub Actions workflows
    happen to run at the same time.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(ingested_at) FROM regional_prices")
            result = cur.fetchone()[0]
    finally:
        conn.close()

    if result is None:
        return False

    age = datetime.now(timezone.utc) - result
    return age < timedelta(minutes=28)


def load_regional_prices_history(conn, df) -> int:
    """
    Load regional_prices_history.
    Reuses _upsert from load.py — same pattern as all other tables.
    PK: (timestamp, grid_zone_id)
    """
    return _upsert(
        conn,
        df,
        "regional_prices_history",
        ["timestamp", "grid_zone_id"]
    )


def run_fast_ingest():
    if is_data_fresh():
        logger.info("Data already fresh — skipping")
        return

    logger.info("Fetching data from em6 API")
    raw = fetch_all()
    transformed = transform_all(raw)

    conn = get_connection()

    try:
        # ── 1. Regional prices → dashboard map ───────────────
        regional_df = transformed.get("regional_prices")
        if regional_df is not None and not regional_df.empty:
            load_regional_prices(conn, regional_df)
        else:
            logger.warning("No regional price data returned")

        # ── 2. Regional prices history → time series later ───
        if regional_df is not None and not regional_df.empty:
            load_regional_prices_history(conn, regional_df)

        # ── 3. Carbon intensity → live KPI card ──────────────
        carbon_df = transformed.get("carbon_intensity")
        if carbon_df is not None and not carbon_df.empty:
            load_carbon_intensity(conn, carbon_df)
        else:
            logger.warning("No carbon intensity data returned")

    except Exception as e:
        logger.error(f"Fast ingest failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()
        logger.info("Database connection closed")

    logger.info("Fast ingest complete")


if __name__ == "__main__":
    run_fast_ingest()

    