# ============================================================
# api/models.py
# Pydantic response models for all API endpoints
# These define the exact shape of every JSON response
# ============================================================
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ============================================================
# Base model — shared config for all models
# Handles Decimal → float conversion for JSON serialization
# ============================================================
class Base(BaseModel):
    class Config:
        json_encoders = {Decimal: float}


# ============================================================
# Carbon Intensity Models
# ============================================================
class CarbonLatest(Base):
    timestamp_utc:           datetime
    timestamp_nzt:           datetime
    trading_period:          int
    period_label:            str
    nz_carbon_gkwh:          Optional[float]
    nz_carbon_change_gkwh:   Optional[float]
    nz_carbon_t:             float
    renewable_pct:           float
    grid_status:             str
    carbon_status:           str
    carbon_trend:            str
    vs_month_avg_pct:        Optional[float]
    max_24hrs_gkwh:          float
    min_24hrs_gkwh:          float
    current_month_avg_gkwh:  float
    current_year_avg_gkwh:   float
    pct_current_year_gkwh:   float
    position_in_24hr_range: Optional[float]


class CarbonTrendPoint(Base):
    timestamp_utc:  datetime
    timestamp_nzt:  datetime
    trading_period: int
    nz_carbon_gkwh: float
    renewable_pct:  float
    carbon_status:  str
    grid_status:    str


# ============================================================
# Price Models
# ============================================================
class NodePricePoint(Base):
    timestamp_utc:     datetime
    timestamp_nzt:     datetime
    trading_period:    int
    node_id:           str
    city_name:         str
    island:            str
    price_nzd_mwh:     float
    price_category:    str
    is_reference_node: bool
    avg_24hr_price:    Optional[float]
    min_24hr_price:    Optional[float]
    max_24hr_price:    Optional[float]


class RegionalPrice(Base):
    timestamp_utc:  datetime
    trading_period: int
    grid_zone_id:   int
    grid_zone_name: str
    island:         str
    price_nzd_mwh:  float


class DailySummary(Base):
    date_nzt:          str
    avg_carbon_gkwh:   Optional[float]
    avg_renewable_pct: Optional[float]
    avg_price_ota:     Optional[float]
    avg_price_hay:     Optional[float]
    avg_price_ben:     Optional[float]
    max_price_ota:     Optional[float]
    min_price_ota:     Optional[float]
    ni_si_spread:      Optional[float]
    grid_status:       Optional[str]


# ============================================================
# Reserve Models
# ============================================================
class ReserveLatest(Base):
    timestamp_utc:       datetime
    timestamp_nzt:       datetime
    trading_period:      int
    region:              str
    region_label:        str
    sir_price:           float
    fir_price:           float
    total_reserve_price: float
    grid_stress:         str


# ============================================================
# Spread Models
# ============================================================
class SpreadLatest(Base):
    timestamp_utc:    datetime
    timestamp_nzt:    datetime
    trading_period:   int
    ota_price:        float
    ben_price:        float
    hay_price:        Optional[float]
    ni_si_spread:     float
    spread_abs:       float
    spread_direction: str
    spread_status:    str
    spread_pct:       Optional[float]


# ============================================================
# Health Model
# ============================================================
class HealthCheck(Base):
    status:      str
    database:    str
    latest_data: Optional[str]
    rows_today:  Optional[int]

# ============================================================
# Generation Forecast Models
# ============================================================
class GenerationShortfallCarbon(Base):
    """
    Panel 1 - Renewable Shortfall vs Carbon Intensity
    JOIN: generation_forecast + carbon_intensity on timestamp
    """

    timestamp_utc:          datetime
    timestamp_nzt:          str
    trading_period:         int
    region:                 str
    generation_type:        str
    generation_label:       str
    forecast_mw:            Optional[float]
    potential_forecast_mw:  Optional[float]
    shortfall_mw:           Optional[float]
    forecast_accuracy_pct:  Optional[float]
    nz_carbon_gkwh:         Optional[float]
    carbon_status:          Optional[str] = None   
    renewable_pct:          Optional[float]
    cleared_mw:             Optional[float] = None  

class GenerationIslandSpread(Base):
    """
    Panel 2 - NI vs SI Generation Imabalance vs HVDC Spread 
    JOIN: generation_forecast (NI vs SI) + mart_ni_si_spread on timestamp
    """

    timestamp_utc: datetime
    timestamp_nzt: str
    trading_period: int
    generation_label: str
    generation_type:  str
    ni_forecast_mw:   Optional[float]
    ni_cleared_mw:    Optional[float]
    ni_shortfall_mw:  Optional[float]
    si_forecast_mw:   Optional[float]
    si_cleared_mw:    Optional[float]
    si_shortfall_mw:  Optional[float]
    si_ni_imbalance_mw: Optional[float]
    ni_si_spread:       Optional[float]
    spread_direction:   Optional[str]
    spread_status:      Optional[str]


class GenerationShortfallPrice(Base):
    """
    Panel 3 - Renewable Shortfall vs Regional Price Scarity 
    JOIN: generation_forecast + regional_price on timestamp 
    """

    timestamp_utc:    datetime
    timestamp_nzt:    str
    trading_period:   int
    generation_type:  str
    generation_label: str
    total_shortfall_mw: Optional[float]
    total_cleared_mw:   Optional[float]
    forecast_accuracy_pct:  Optional[float]
    avg_price_nzd_mwh: Optional[float]
    max_price_nzd_mwh: Optional[float]
    min_price_nzd_mwh: Optional[float]
    ni_avg_price:      Optional[float]
    si_avg_price:      Optional[float]