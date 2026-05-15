-- ============================================================
-- assert_renewable_pct_valid.sql
-- Renewable % must always be between 0 and 100
-- Returns rows that FAIL the test (dbt fails if any rows returned)
-- ============================================================

select *
from {{ ref('stg_em6__carbon_intensity') }}
where renewable_pct < 0
    or renewable_pct > 100