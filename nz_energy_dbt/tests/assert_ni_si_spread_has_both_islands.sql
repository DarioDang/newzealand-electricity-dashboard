-- ============================================================
-- assert_ni_si_spread_has_both_islands.sql
-- Every trading period in mart_ni_si_spread must have
-- both OTA and BEN prices (not null)
-- ============================================================

select *
from {{ ref('mart_ni_si_spread') }}
where ota_price is null or ben_price is null
