-- ============================================================
-- assert_trading_period_range.sql
-- Trading period must always be between 1 and 48
-- ============================================================

select *
from {{ ref('stg_em6__carbon_intensity') }}
where trading_period < 1
   or trading_period > 48