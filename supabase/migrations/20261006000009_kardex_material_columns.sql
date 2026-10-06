-- =============================================================================
-- Workflow · 009 · Material data in material_kardex
--
-- The global movements list (all materials) needs the material code, name and
-- unit on each ledger row. CREATE OR REPLACE VIEW can only append columns, so
-- the new ones go at the end.
-- =============================================================================

create or replace view public.material_kardex
with (security_invoker = true)
as
select
  mv.id,
  mv.seq,
  mv.material_id,
  mv.movement_type,
  mv.quantity,
  mv.on_hand_delta,
  mv.reserved_delta,
  mv.on_hand_before,
  mv.on_hand_after,
  mv.reserved_before,
  mv.reserved_after,
  mv.unit_cost,
  mv.total_cost,
  mv.avg_cost_after,
  mv.work_order_id,
  wo.number      as work_order_number,
  mv.source_table,
  mv.source_id,
  mv.reference,
  mv.notes,
  mv.negative_override,
  mv.occurred_at,
  mv.created_by,
  p.full_name    as created_by_name,
  m.sku          as material_sku,
  m.name         as material_name,
  u.symbol       as unit_symbol,
  u.decimals     as unit_decimals
from public.inventory_movements mv
join public.materials m on m.id = mv.material_id
join public.units u on u.id = m.base_unit_id
left join public.work_orders wo on wo.id = mv.work_order_id
left join public.profiles p on p.id = mv.created_by;
