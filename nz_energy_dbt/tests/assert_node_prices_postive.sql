-- ============================================================
-- assert_node_prices_positive.sql
-- Spot prices must always be positive
-- ============================================================

select *
from {{ ref('stg_em6__node_prices') }}
where price_nzd_mwh <= 0

