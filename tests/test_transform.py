# ============================================================
# tests/test_transform.py
# Unit tests for pipeline/transform.py
# No API calls, no DB — uses hardcoded sample data
# Run: pytest tests/test_transform.py -v
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pipeline'))

import pytest
import pandas as pd
from transform import (
    transform_carbon_intensity,
    transform_node_prices,
    transform_regional_prices,
    transform_generation_forecast,
    transform_reserve_prices,
)


# ============================================================
# Sample raw data — mirrors real API responses
# ============================================================

SAMPLE_CARBON = {
    "items": [
        {
            "trading_date": "2026-05-12T12:00:00Z",
            "trading_period": 31,
            "timestamp": "2026-05-13T03:00:00Z",
            "nz_carbon_t": 111.83,
            "nz_carbon_gkwh": 45.15,
            "nz_carbon_gkwh_prev": 44.59,   # should be dropped
            "nz_carbon_change_gkwh": 0.56,
            "nz_renewable": 94.19,
            "max_24hrs_gkwh": 74.28,
            "min_24hrs_gkwh": 43.78,
            "current_month_avg_gkwh": 53.4,
            "current_year_avg_gkwh": 50.11,
            "pct_current_year_gkwh": 36.72
        }
    ]
}

SAMPLE_NODE_PRICES = {
    "items": [
        {"timestamp": "2026-05-12T04:30:00Z", "trading_period": 34,
         "node_id": "OTA2201", "price": 119.32},
        {"timestamp": "2026-05-12T04:30:00Z", "trading_period": 34,
         "node_id": "BEN2201", "price": 94.68},
    ]
}

SAMPLE_REGIONAL = {
    "items": [
        {"timestamp": "2026-05-13T04:00:00Z", "trading_period": 33,
         "grid_zone_id": 2, "grid_zone_name": "Auckland", "price": 50.93},
        {"timestamp": "2026-05-13T04:00:00Z", "trading_period": 33,
         "grid_zone_id": 10, "grid_zone_name": "Christchurch", "price": 46.99},
    ]
}

SAMPLE_FORECAST = {
    "items": [
        {"trading_period": 34, "timestamp": "2026-05-13T04:30:00Z",
         "region": "NI", "generation_type": "SOL",
         "forecast_generation": 20.699, "potential_forecast_generation": 20.699,
         "cleared": 20.740, "shortfall": -0.041},
        {"trading_period": 34, "timestamp": "2026-05-13T04:30:00Z",
         "region": "NI", "generation_type": "WIN",
         "forecast_generation": 229.833, "potential_forecast_generation": 233.729,
         "cleared": 252.180, "shortfall": -22.347},
    ]
}

SAMPLE_RESERVE = {
    "items": [
        {"timestamp": "2026-05-13T05:00:00Z",
         "trading_date": "2026-05-12T12:00:00Z",
         "trading_period": 35, "region": "NI",
         "sir price": 4.06, "fir price": 4.06},
        {"timestamp": "2026-05-13T05:00:00Z",
         "trading_date": "2026-05-12T12:00:00Z",
         "trading_period": 35, "region": "SI",
         "sir price": 3.71, "fir price": 2.97},
    ]
}


# ============================================================
# carbon_intensity tests
# ============================================================

class TestTransformCarbonIntensity:

    def test_returns_dataframe(self):
        df = transform_carbon_intensity(SAMPLE_CARBON)
        assert isinstance(df, pd.DataFrame)

    def test_correct_row_count(self):
        df = transform_carbon_intensity(SAMPLE_CARBON)
        assert len(df) == 1

    def test_timestamp_is_utc(self):
        df = transform_carbon_intensity(SAMPLE_CARBON)
        assert str(df["timestamp"].dtype) == "datetime64[ns, UTC]"

    def test_prev_column_dropped(self):
        df = transform_carbon_intensity(SAMPLE_CARBON)
        assert "nz_carbon_gkwh_prev" not in df.columns

    def test_renewable_is_float(self):
        df = transform_carbon_intensity(SAMPLE_CARBON)
        assert df["nz_renewable"].dtype == "float64"

    def test_empty_input_returns_empty_df(self):
        df = transform_carbon_intensity({"items": []})
        assert df.empty

    def test_missing_items_key(self):
        df = transform_carbon_intensity({})
        assert df.empty


# ============================================================
# node_prices tests
# ============================================================

class TestTransformNodePrices:

    def test_returns_dataframe(self):
        df = transform_node_prices(SAMPLE_NODE_PRICES)
        assert isinstance(df, pd.DataFrame)

    def test_correct_columns(self):
        df = transform_node_prices(SAMPLE_NODE_PRICES)
        assert list(df.columns) == ["timestamp", "trading_period", "node_id", "price"]

    def test_timestamp_is_utc(self):
        df = transform_node_prices(SAMPLE_NODE_PRICES)
        assert str(df["timestamp"].dtype) == "datetime64[ns, UTC]"

    def test_price_is_float(self):
        df = transform_node_prices(SAMPLE_NODE_PRICES)
        assert df["price"].dtype == "float64"

    def test_correct_row_count(self):
        df = transform_node_prices(SAMPLE_NODE_PRICES)
        assert len(df) == 2

    def test_empty_input_returns_empty_df(self):
        df = transform_node_prices({"items": []})
        assert df.empty


# ============================================================
# regional_prices tests
# ============================================================

class TestTransformRegionalPrices:

    def test_grid_zone_name_dropped(self):
        df = transform_regional_prices(SAMPLE_REGIONAL)
        assert "grid_zone_name" not in df.columns

    def test_correct_columns(self):
        df = transform_regional_prices(SAMPLE_REGIONAL)
        assert list(df.columns) == [
            "timestamp", "trading_period", "grid_zone_id", "price"
        ]

    def test_grid_zone_id_is_int(self):
        df = transform_regional_prices(SAMPLE_REGIONAL)
        assert str(df["grid_zone_id"].dtype) == "Int64"

    def test_correct_row_count(self):
        df = transform_regional_prices(SAMPLE_REGIONAL)
        assert len(df) == 2


# ============================================================
# generation_forecast tests
# ============================================================

class TestTransformGenerationForecast:

    def test_columns_renamed(self):
        df = transform_generation_forecast(SAMPLE_FORECAST)
        assert "forecast_mw" in df.columns
        assert "potential_forecast_mw" in df.columns
        assert "cleared_mw" in df.columns
        assert "shortfall_mw" in df.columns
        assert "forecast_generation" not in df.columns
        assert "cleared" not in df.columns

    def test_correct_row_count(self):
        df = transform_generation_forecast(SAMPLE_FORECAST)
        assert len(df) == 2

    def test_timestamp_is_utc(self):
        df = transform_generation_forecast(SAMPLE_FORECAST)
        assert str(df["timestamp"].dtype) == "datetime64[ns, UTC]"

    def test_generation_types(self):
        df = transform_generation_forecast(SAMPLE_FORECAST)
        assert set(df["generation_type"].unique()) == {"SOL", "WIN"}


# ============================================================
# reserve_prices tests
# ============================================================

class TestTransformReservePrices:

    def test_columns_renamed(self):
        df = transform_reserve_prices(SAMPLE_RESERVE)
        assert "sir_price" in df.columns
        assert "fir_price" in df.columns
        assert "sir price" not in df.columns
        assert "fir price" not in df.columns

    def test_correct_row_count(self):
        df = transform_reserve_prices(SAMPLE_RESERVE)
        assert len(df) == 2

    def test_both_regions_present(self):
        df = transform_reserve_prices(SAMPLE_RESERVE)
        assert set(df["region"].unique()) == {"NI", "SI"}

    def test_prices_are_float(self):
        df = transform_reserve_prices(SAMPLE_RESERVE)
        assert df["sir_price"].dtype == "float64"
        assert df["fir_price"].dtype == "float64"