# Workflow — Modelo de datos

Base de datos: PostgreSQL (Supabase). Las migraciones en `supabase/migrations/`
son la fuente de verdad; este documento explica el diseño y debe actualizarse
junto con ellas.

## 1. Convenciones

| Tema | Convención |
|------|-----------|
| Nombres | Inglés, `snake_case`, tablas en plural. La UI está en español. |
| Claves primarias | `id uuid default gen_random_uuid()`. Catálogos fijos (`roles`, `document_sequences`, `app_settings`) usan un `code`/`key` de texto. `audit_logs` usa `bigint identity`. |
| Orden estable | `inventory_movements.seq bigint identity` ordena el kardex sin depender del reloj. |
| Auditoría de fila | `created_at`, `updated_at`, `created_by`, `updated_by` (→ `profiles.id`), llenados por triggers (`set_audit_fields`). |
| Estado | `is_active boolean` en catálogos. Documentos: `voided_at`, `voided_by`, `void_reason` (anulación). |
| Cantidades | `numeric(14,4)` — hasta 9 999 999 999.9999 en la unidad base. |
| Costos / montos | `numeric(18,4)`; la UI muestra 2 decimales. |
| Integración externa | `external_source text`, `external_id text` (único por fuente). |
| Borrado | Ninguna tabla crítica tiene política RLS de `DELETE`. |
| Funciones | `search_path = ''` y nombres totalmente calificados (`public.x`). |

## 2. Diagrama (resumen)

```
auth.users 1─1 profiles ─N─1 roles 1─N role_permissions

categories 1─N materials N─1 units (unidad base)
locations  1─N materials N─1 suppliers (proveedor principal)

materials 1─N inventory_movements N─1 work_orders
          │                      └── source_table/source_id → documento origen
          ├─N inventory_receipt_lines N─1 inventory_receipts N─1 suppliers
          ├─N inventory_adjustments
          ├─N remnants (futuro)
          └─N unit_conversions (futuro)

customers 1─N work_orders 1─N work_order_events (timeline)
                          1─N work_order_materials (planificado) 1─N material_reservations
                          1─N material_consumptions
                          1─N waste_records

attachments (polimórfica: entity_table + entity_id)   audit_logs (todas las acciones)
```

## 3. Tipos enumerados

| Enum | Valores | Etiqueta UI |
|------|---------|-------------|
| `unit_kind` | `count`, `length`, `area`, `volume`, `mass`, `package` | Conteo, Longitud, Área, Volumen, Masa, Empaque |
| `movement_type` | `entry`, `exit`, `reservation`, `reservation_release`, `consumption`, `waste`, `return`, `adjustment_in`, `adjustment_out` | Entrada, Salida, Reserva, Liberación de reserva, Consumo, Merma, Devolución, Ajuste positivo, Ajuste negativo |
| `work_order_status` | `draft`, `pending`, `planned`, `in_production`, `in_installation`, `completed`, `cancelled` | Borrador, Pendiente, Planificada, En producción, En instalación, Terminada, Cancelada |
| `work_order_priority` | `low`, `normal`, `high`, `urgent` | Baja, Normal, Alta, Urgente |
| `waste_reason` | `print_error`, `cutting`, `damage`, `test`, `installation`, `defect`, `other` | Error de impresión, Corte, Daño, Prueba, Instalación, Defecto, Otro |
| `reservation_status` | `active`, `released`, `consumed` | Activa, Liberada, Consumida |
| `remnant_status` | `available`, `reserved`, `used`, `discarded` | Disponible, Reservado, Usado, Descartado |

## 4. Tablas

### 4.1 Seguridad y configuración

**`roles`** — `code text PK`, `name`, `description`, `sort_order`.
Semilla: `admin`, `supervisor`, `warehouse`, `production`, `viewer`.

**`role_permissions`** — `(role_code → roles, permission text) PK`.
Permisos en formato `modulo.accion` (ver BUSINESS_RULES §9).

**`profiles`** — 1:1 con `auth.users`.
`id uuid PK → auth.users(id) on delete cascade`, `email`, `full_name`,
`role_code → roles (default 'viewer')`, `is_active (default true)`, `phone`,
campos de auditoría. Se crea automáticamente con el trigger `on_auth_user_created`.
Como otras tablas referencian `profiles` con `on delete restrict`, un usuario con
actividad no puede borrarse: se desactiva.

**`app_settings`** — `key text PK`, `value jsonb`, `description`.
Semilla: `currency` (`"DOP"`), `currency_symbol` (`"RD$"`),
`consumption_variance_alert_pct` (10), `waste_alert_pct` (5).

**`document_sequences`** — `code PK`, `prefix`, `padding`, `next_value`.
Semilla: `material` (MAT-, 4), `work_order` (OT-, 6), `inventory_receipt` (ENT-, 6),
`inventory_adjustment` (AJ-, 6). La función `next_document_number(code)` hace
`UPDATE … RETURNING` (bloqueo de fila) y devuelve p. ej. `OT-000245`.

### 4.2 Catálogos

**`categories`** — `id`, `name` (único sin distinguir mayúsculas), `description`,
`sort_order`, `is_active`, auditoría.

**`units`** — `id`, `code` (único: `m2`, `ml`, `und`…), `name`, `symbol`, `kind unit_kind`,
`decimals smallint 0–4` (precisión permitida: tornillos = 0, m² = 2),
`is_active`, auditoría.

**`unit_conversions`** *(preparada, sin uso en v1)* — `id`, `from_unit_id`,
`to_unit_id`, `factor numeric(18,8) > 0`, `material_id` nulo = conversión
general; con valor = específica del material (p. ej. *1 rollo de vinil X = 50 m²*).
Único por `(from_unit_id, to_unit_id, material_id)`.

**`locations`** — `id`, `code` (único), `name`, `description`, `is_active`, auditoría.

**`suppliers`** — `id`, `code` (único), `name`, `tax_id` (RNC), `contact_name`,
`phone`, `email`, `address`, `notes`, `is_active`, `external_source`,
`external_id`, auditoría.

**`customers`** — mismas columnas que `suppliers`.

### 4.3 Materias primas

**`materials`**

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid PK | |
| `sku` | text único | Autogenerado `MAT-0001` si se deja vacío. |
| `name` | text | |
| `description` | text | |
| `category_id` | → categories | requerido |
| `base_unit_id` | → units | Unidad base de inventario. **No cambia** si hay movimientos. |
| `avg_cost` | numeric(18,4) | Costo promedio ponderado. Solo lo cambian las RPC. |
| `last_cost` | numeric(18,4) | Último costo de entrada. Solo RPC. |
| `stock_on_hand` | numeric(14,4) | Stock físico. Solo RPC. |
| `stock_reserved` | numeric(14,4) ≥ 0 | Stock reservado. Solo RPC. |
| `stock_available` | generada | `stock_on_hand - stock_reserved` |
| `min_stock` | numeric(14,4) ≥ 0 | |
| `max_stock` | numeric(14,4) nulo | ≥ `min_stock` |
| `location_id` | → locations nulo | |
| `primary_supplier_id` | → suppliers nulo | |
| `tracks_remnants` | boolean | Preparado para retazos. |
| `is_active` | boolean | Activo / Inactivo |
| `external_source`, `external_id` | text | ADM Cloud (futuro) |
| auditoría | | |

Índices: `sku` único, `lower(name)`, `category_id`, `is_active`.
Trigger `guard_material_balances`: rechaza cualquier cambio de `stock_on_hand`,
`stock_reserved`, `avg_cost`, `last_cost` que no venga de una función de
inventario (bandera de transacción `workflow.inventory_write`).

### 4.4 Libro mayor de inventario

**`inventory_movements`** (inmutable — trigger bloquea `UPDATE`/`DELETE`)

| Columna | Notas |
|---------|-------|
| `id` uuid PK, `seq` bigint identity | |
| `material_id` → materials | |
| `movement_type` movement_type | |
| `quantity` numeric(14,4) > 0 | Magnitud del movimiento en unidad base. |
| `on_hand_delta`, `reserved_delta` | Efecto con signo sobre físico y reservado. |
| `on_hand_before`, `on_hand_after` | = *cantidad_anterior / cantidad_nueva* del requerimiento. |
| `reserved_before`, `reserved_after` | |
| `unit_cost`, `total_cost` | Valoración del movimiento (nulo en reservas/liberaciones). |
| `avg_cost_before`, `avg_cost_after` | Trazabilidad del costo promedio. |
| `work_order_id` → work_orders nulo | |
| `source_table`, `source_id` | Documento que originó el movimiento. |
| `reference` | Texto legible (p. ej. `ENT-000012`, `Factura B0100000123`). |
| `notes` | Observación |
| `negative_override` boolean | `true` si un administrador autorizó stock negativo. |
| `occurred_at` | Fecha del hecho (puede diferir de `created_at`). |
| `created_by`, `created_at` | |

Índices: `(material_id, seq)`, `work_order_id`, `(movement_type, occurred_at)`,
`(source_table, source_id)`.

Efecto de cada tipo:

| Tipo | Físico | Reservado | Disponible |
|------|:-----:|:--------:|:---------:|
| entry | + | | + |
| exit | − | | − |
| reservation | | + | − |
| reservation_release | | − | + |
| consumption | − | − (lo reservado para esa OT) | − (solo lo no reservado) |
| waste | − | − (si había reserva) | − |
| return | + | | + |
| adjustment_in | + | | + |
| adjustment_out | − | | − |

**`inventory_receipts`** (Entradas — encabezado) — `id`, `number` (ENT-000001),
`receipt_date`, `supplier_id`, `invoice_number`, `notes`, `total_cost`,
`voided_at`, `voided_by`, `void_reason`, auditoría.

**`inventory_receipt_lines`** — `id`, `receipt_id`, `line_no`, `material_id`,
`unit_id` (unidad digitada), `quantity`, `conversion_factor` (1 en v1),
`base_quantity` (= quantity × factor), `unit_cost`, `line_total`, `movement_id`,
`notes`.

**`inventory_adjustments`** — `id`, `number` (AJ-000001), `material_id`,
`movement_type` (`adjustment_in` | `adjustment_out`), `quantity`, `unit_cost`,
`reason`, `notes`, `is_opening_balance`, `movement_id`, auditoría.

### 4.5 Órdenes de trabajo

**`work_orders`** — `id`, `number` (OT-000001), `customer_id`, `title`,
`description`, `status`, `priority`, `due_date`, `responsible_id → profiles`,
`started_at`, `completed_at`, `cancelled_at`, `cancel_reason`,
`estimated_material_cost` (cache), `actual_material_cost` (cache, se fija al cerrar),
`external_source`, `external_id`, auditoría.

**`work_order_events`** (timeline, inmutable) — `id`, `work_order_id`,
`event_type` (`created`, `status_changed`, `material_planned`, `reserved`,
`released`, `consumed`, `waste`, `closed`, `note`…), `from_status`, `to_status`,
`payload jsonb`, `note`, `created_by`, `created_at`.

**`work_order_materials`** (materiales planificados) — `id`, `work_order_id`,
`material_id` (único por OT), `planned_quantity`, `estimated_unit_cost`
(snapshot del promedio al planificar), `estimated_total_cost` (generada),
`reserved_quantity`, `consumed_quantity`, `waste_quantity` (caches mantenidos por
RPC), `notes`, auditoría.

**`material_reservations`** — `id`, `work_order_id`, `work_order_material_id`,
`material_id`, `quantity`, `remaining_quantity` (aún reservado),
`status reservation_status`, `movement_id`, `released_at`, auditoría.
Un consumo de la misma OT descuenta `remaining_quantity` (FIFO).

**`material_consumptions`** — `id`, `work_order_id`, `work_order_material_id`
(nulo = consumo no planificado), `material_id`, `quantity`, `unit_cost`
(promedio congelado), `total_cost`, `movement_id`, `consumed_at`, `notes`,
`voided_at`, `voided_by`, `void_reason`, auditoría.

**`waste_records`** — `id`, `work_order_id` (nulo = merma de almacén),
`work_order_material_id`, `material_id`, `quantity`, `reason waste_reason`,
`unit_cost`, `total_cost`, `movement_id`, `occurred_at`, `notes`, anulación,
auditoría.

### 4.6 Futuro (tablas creadas, sin interfaz todavía)

**`remnants`** (retazos) — `id`, `code`, `material_id`, `width`, `length`,
`area` (generada = width × length), `quantity` (en unidad base del material),
`location_id`, `status remnant_status`, `origin_work_order_id`,
`used_in_work_order_id`, `notes`, auditoría.
Regla: un retazo **no suma** stock adicional; describe una parte del
`stock_on_hand`. Ver BUSINESS_RULES §7.

**`attachments`** — `id`, `entity_table`, `entity_id`, `bucket`, `storage_path`,
`file_name`, `mime_type`, `size_bytes`, `deleted_at`, auditoría.

### 4.7 Auditoría

**`audit_logs`** — `id bigint identity`, `occurred_at`, `actor_id`, `action`
(`insert`/`update`/`delete` o evento de negocio como `inventory.receipt.posted`),
`entity_table`, `entity_id`, `summary` (texto legible), `old_data jsonb`,
`new_data jsonb`, `changed_fields text[]`.
Se llena por:
1. El trigger genérico `audit_row_change` en catálogos, materiales, órdenes,
   perfiles y configuración.
2. Las RPC de inventario (evento de negocio explícito).
Nadie puede modificar ni borrar registros de auditoría.

## 5. Funciones principales

| Función | Expuesta | Descripción |
|---------|:-------:|-------------|
| `has_permission(text)` | sí | ¿El usuario actual (activo) tiene el permiso? |
| `current_user_permissions()` | sí | Lista de permisos del usuario actual (para la UI). |
| `next_document_number(text)` | no | Siguiente número de documento. |
| `apply_stock_movement(...)` | **no** | Motor interno: bloquea, valida, inserta movimiento, actualiza saldos y costo promedio. |
| `create_material(...)` | sí | Crea material (SKU automático opcional) y su existencia inicial en una sola transacción. Requiere `materials.manage` (ver ARCHITECTURE D-016). |
| `post_inventory_receipt(...)` | sí | Registra una entrada con N líneas. |
| `create_inventory_adjustment(...)` | sí | Ajuste positivo/negativo con motivo. |
| `get_dashboard_summary()` | sí | KPIs del dashboard en una sola llamada. |
| `get_top_consumed_materials(desde, límite)` | sí | Materiales con mayor consumo + merma (por costo) desde una fecha; por defecto, el mes en curso. |
| `reserve_material`, `release_reservation`, `consume_material`, `register_waste`, `change_work_order_status`, `close_work_order` | Fase 3 | Contratos definidos en BUSINESS_RULES. |

## 6. Vistas

Todas con `security_invoker = true` (respetan RLS del usuario).

- `materials_overview` — materiales + categoría, unidad, ubicación, proveedor,
  `stock_available`, `inventory_value` (= físico × costo promedio) y
  `stock_status` (`out`, `low`, `ok`, `inactive`). Base de la tabla de inventario.
- `material_kardex` — movimientos + número de OT + nombre del usuario.

## 7. Políticas RLS (resumen)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | usuario activo | (trigger) | propio nombre / `users.manage` | — |
| roles, role_permissions | usuario activo | `users.manage` | `users.manage` | `users.manage` (solo permisos) |
| categories, units, locations, unit_conversions | usuario activo | `catalog.manage` | `catalog.manage` | — |
| suppliers | usuario activo | `suppliers.manage` | `suppliers.manage` | — |
| customers | usuario activo | `customers.manage` | `customers.manage` | — |
| materials | usuario activo | (RPC `create_material`) | `materials.manage` (sin saldos) | — |
| inventory_* , material_*, waste_records | usuario activo | solo RPC | solo RPC | — |
| work_orders | usuario activo | `work_orders.manage` | `work_orders.manage` (estado/costos guardados por trigger) | — |
| work_order_materials | usuario activo | `work_orders.manage` | `work_orders.manage` | `work_orders.manage`, solo líneas sin reservas, consumos ni mermas (dato de planificación, auditado) |
| work_order_events | usuario activo | solo RPC/trigger | — | — |
| app_settings, document_sequences | usuario activo | — | `settings.manage` | — |
| audit_logs | `audit.view` | solo funciones | — | — |
| remnants, attachments | usuario activo | `materials.manage` | `materials.manage` | — |

## 8. Migraciones

| Archivo | Contenido |
|---------|-----------|
| `…_001_foundation.sql` | Extensiones, enums, helpers (`set_audit_fields`, `block_mutation`), roles, perfiles, permisos, configuración, secuencias, auditoría. |
| `…_002_catalogs.sql` | Categorías, unidades, conversiones, ubicaciones, proveedores, clientes + datos base. |
| `…_003_materials_inventory.sql` | Materiales, movimientos, entradas, ajustes, motor de stock y RPC de inventario. |
| `…_004_work_orders.sql` | Órdenes, timeline, planificado, reservas, consumos, mermas. |
| `…_005_future_remnants_attachments.sql` | Retazos y adjuntos. |
| `…_006_views_dashboard.sql` | Vistas, `get_dashboard_summary` y `get_top_consumed_materials`. |
| `…_007_rls_grants.sql` | Activación de RLS, grants por columna y políticas. |

**Regla para nuevas migraciones:** nunca editar una migración ya aplicada en un
entorno; crear una nueva. Toda tabla nueva debe activar RLS y otorgar permisos
explícitamente (007 revoca los privilegios por defecto).

**Pruebas:** `supabase/tests/inventory_rules_test.sql` (requiere base sin
semilla; corre en una transacción con `ROLLBACK`). En CI se ejecuta sobre
PostgreSQL 17 con `supabase/tests/supabase_stub.sql`.

`supabase/seed.sql` contiene datos de demostración (proveedores y materiales de
ejemplo) y solo se ejecuta en desarrollo local (`supabase db reset`).
