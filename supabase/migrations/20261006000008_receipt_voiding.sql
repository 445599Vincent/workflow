-- =============================================================================
-- Workflow · 008 · Voiding inventory receipts (BR ENT-05)
--
-- A posted receipt is never deleted. Voiding it writes one reversing 'exit'
-- movement per line at the line's original cost (which also reverses the
-- weighted average), then stamps voided_at / voided_by / void_reason.
-- It fails as a whole if any material no longer has enough available stock.
-- =============================================================================

create or replace function public.void_inventory_receipt(
  p_receipt_id uuid,
  p_reason     text
)
returns public.inventory_receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.inventory_receipts%rowtype;
  v_line    record;
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.require_permission('inventory.void');

  if v_reason is null then
    raise exception 'Indique el motivo de la anulación.' using errcode = 'P0001';
  end if;

  -- Lock the receipt so two users cannot void it at the same time.
  select * into v_receipt from public.inventory_receipts where id = p_receipt_id for update;
  if not found then
    raise exception 'Entrada no encontrada.' using errcode = 'P0001';
  end if;
  if v_receipt.voided_at is not null then
    raise exception 'La entrada % ya fue anulada.', v_receipt.number using errcode = 'P0001';
  end if;

  -- Material order keeps lock acquisition consistent with post_inventory_receipt.
  for v_line in
    select l.id, l.line_no, l.material_id, l.base_quantity, l.unit_cost
    from public.inventory_receipt_lines l
    where l.receipt_id = p_receipt_id
    order by l.material_id, l.line_no
  loop
    perform public.apply_stock_movement(
      p_material_id   => v_line.material_id,
      p_movement_type => 'exit',
      p_quantity      => v_line.base_quantity,
      p_unit_cost     => v_line.unit_cost,
      p_source_table  => 'inventory_receipt_lines',
      p_source_id     => v_line.id,
      p_reference     => 'Anulación ' || v_receipt.number,
      p_notes         => v_reason
    );
  end loop;

  update public.inventory_receipts
     set voided_at   = now(),
         voided_by   = auth.uid(),
         void_reason = v_reason
   where id = p_receipt_id
  returning * into v_receipt;

  perform public.log_audit_event(
    'inventory.receipt.voided', 'inventory_receipts', v_receipt.id::text,
    format('Anuló la entrada %s: %s', v_receipt.number, v_reason),
    to_jsonb(v_receipt)
  );

  return v_receipt;
end;
$$;

comment on function public.void_inventory_receipt is
  'Voids a receipt by reversing each line at its original cost. All-or-nothing.';

revoke execute on function public.void_inventory_receipt(uuid, text) from public, anon;
grant execute on function public.void_inventory_receipt(uuid, text) to authenticated;
