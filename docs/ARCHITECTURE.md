# Workflow — Arquitectura

> Documento vivo. Toda decisión que afecte el modelo de datos o la integridad del
> inventario se registra en la sección [Registro de decisiones](#9-registro-de-decisiones-adr)
> antes de implementarse.

## 1. Propósito y alcance

Workflow es una aplicación web para una empresa de letreros, vallas, impresión,
rotulación e instalaciones. Su especialidad es **una sola**:

> **Control de materia prima + órdenes de trabajo.**

Debe responder en todo momento:

1. ¿Qué material tenemos? (stock físico)
2. ¿Qué material está comprometido? (stock reservado)
3. ¿Qué material se utilizó y en qué trabajo? (consumos por OT)
4. ¿Cuánto se desperdició? (mermas)
5. ¿Cuánto costó realmente cada trabajo? (costo real vs estimado)

### Fuera de alcance (lo sigue manejando ADM Cloud)

Facturación, contabilidad, cuentas por cobrar y procesos administrativos.
Workflow **no** es un ERP y **no** reemplaza ADM Cloud. La arquitectura deja una
capa desacoplada para una futura integración (ver §8).

## 2. Estado inicial del repositorio (Fase 0)

Al iniciar, el repositorio `445599Vincent/workflow` estaba **completamente vacío**:
sin commits, sin `package.json`, sin README ni configuración, tanto en local como
en el remoto. No había trabajo previo que preservar ni inconsistencias heredadas.

Consecuencias:

- El proyecto se inicializa desde cero con `create-next-app` (Next.js 16).
- No hay base de datos existente: el esquema se define desde el inicio con
  migraciones versionadas en `supabase/migrations/`.
- No hay proyecto de Supabase vinculado todavía (ver README → Configuración).

### Problemas técnicos / riesgos detectados

| # | Riesgo | Mitigación |
|---|--------|-----------|
| R1 | Next.js 16 introduce cambios incompatibles (`middleware` → `proxy`, APIs de request asíncronas, Turbopack por defecto). | Seguimos la documentación incluida en `node_modules/next/dist/docs/` (ver `AGENTS.md`). |
| R2 | El registro de componentes de shadcn/ui no siempre es accesible desde CI/entornos cerrados. | Los componentes viven en `src/components/ui/` (es el modelo de shadcn: código propio). `components.json` permite usar el CLI cuando haya acceso. |
| R3 | Sin proyecto Supabase vinculado no se pueden generar tipos automáticamente. | `src/types/database.ts` se mantiene a mano siguiendo el formato de `supabase gen types`; regenerar con `npm run db:types` cuando exista el proyecto. |
| R4 | Concurrencia sobre el stock (dos usuarios consumiendo el mismo material). | Toda mutación de stock pasa por funciones SQL transaccionales con bloqueo de fila (`SELECT … FOR UPDATE`). Ver §6. |
| R5 | ADM Cloud no tiene API documentada disponible. | No se inventan endpoints. Solo interfaces (puertos) y columnas `external_source`/`external_id`. |

## 3. Stack

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Next.js 16 (App Router, Turbopack) | Server Components por defecto; Server Actions para mutaciones. |
| UI | React 19, TypeScript estricto | |
| Estilos | Tailwind CSS 4 + shadcn/ui (Radix) | Tokens de diseño en `src/app/globals.css`. |
| Formularios | react-hook-form + zod 4 | El **mismo** esquema zod valida en cliente y servidor. |
| Backend | Supabase | PostgreSQL, Auth, RLS, RPC (plpgsql), Storage (futuro). |
| Sesión | `@supabase/ssr` | Cookies; refresco de sesión en `src/proxy.ts`. |
| Hosting | Vercel | Variables de entorno en el panel de Vercel. |
| Repositorio | GitHub | Commits pequeños, convencionales (`feat:`, `fix:`, `docs:`…). |

## 4. Vista general

```
┌──────────────────────────── Navegador (PC / tablet / celular) ────────────────────────────┐
│  React (Client Components: formularios, menús, filtros)                                    │
└───────────────▲───────────────────────────────────────────────┬────────────────────────────┘
                │ HTML/RSC                                       │ Server Actions (POST)
┌───────────────┴───────────────── Next.js en Vercel ────────────▼────────────────────────────┐
│ proxy.ts ── refresca sesión Supabase y protege rutas                                       │
│ Server Components ── features/*/queries.ts  (lecturas)                                     │
│ Server Actions    ── features/*/actions.ts  (validación zod → RPC / insert / update)        │
└───────────────┬────────────────────────────────────────────────────────────────────────────┘
                │ supabase-js con el JWT del usuario (nunca service role en la app)
┌───────────────▼───────────────────────── Supabase ─────────────────────────────────────────┐
│ Auth (email + contraseña, recuperación)                                                    │
│ PostgreSQL                                                                                 │
│   ├─ RLS en TODAS las tablas (lectura: usuario activo; escritura: permiso del rol)         │
│   ├─ Funciones RPC transaccionales para TODO cambio de inventario                          │
│   ├─ inventory_movements = libro mayor inmutable (kardex)                                  │
│   └─ audit_logs (triggers + eventos de negocio)                                            │
│ Storage (futuro: adjuntos de entradas y órdenes)                                           │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Principios

1. **La base de datos es la autoridad.** La UI valida para ayudar al usuario;
   PostgreSQL (RLS, `CHECK`, triggers, RPC) valida para proteger los datos.
2. **El stock nunca se edita directamente.** `materials.stock_on_hand` y
   `stock_reserved` son saldos *derivados* del libro de movimientos y solo los
   modifican funciones `SECURITY DEFINER`. Un trigger bloquea cualquier otro intento.
3. **Nada crítico se borra.** Se usa `is_active`, anulación (`voided_at`) o
   movimientos de reverso. Las tablas de libro mayor rechazan `UPDATE`/`DELETE`.
4. **Server-first.** Lecturas en Server Components; el cliente solo recibe lo
   necesario. La `service_role` key nunca llega al navegador (ver D-022).
5. **Simplicidad para el almacén.** Pocas pantallas, acciones claras, lenguaje del
   negocio en español, números grandes y legibles.

## 5. Capas y estructura de carpetas

```
.
├── docs/                         Documentación (este archivo, DB, reglas, roadmap)
├── supabase/
│   ├── config.toml               Config de Supabase CLI (desarrollo local)
│   ├── migrations/               Migraciones SQL versionadas (fuente de verdad del esquema)
│   ├── tests/                    Pruebas de reglas de BD + emulación mínima de Supabase para CI
│   └── seed.sql                  Datos de demostración (solo desarrollo local)
└── src/
    ├── proxy.ts                  Refresco de sesión + protección de rutas (antes "middleware")
    ├── app/                      Rutas (solo composición; sin lógica de negocio)
    │   ├── (auth)/               Login, recuperar y restablecer contraseña
    │   ├── (app)/                Rutas autenticadas con el shell (sidebar + header)
    │   │   ├── dashboard/
    │   │   ├── materials/        Materias primas (lista, nueva, detalle, editar)
    │   │   └── …                 Módulos futuros (placeholders "Próximamente")
    │   └── auth/confirm/         Intercambio de token de email (recuperación)
    ├── components/
    │   ├── ui/                   Primitivas shadcn/ui (Button, Input, Table…)
    │   ├── layout/               Sidebar, header, navegación, menú de usuario
    │   └── shared/               Bloques reutilizables (PageHeader, EmptyState, StatCard…)
    ├── features/                 Un directorio por dominio
    │   └── <dominio>/
    │       ├── schemas.ts        Esquemas zod (cliente + servidor)
    │       ├── queries.ts        Lecturas (server-only)
    │       ├── actions.ts        Server Actions (mutaciones)
    │       ├── types.ts          Tipos del dominio
    │       └── components/       Componentes propios del dominio
    ├── lib/
    │   ├── supabase/             Clientes (browser, server, proxy)
    │   ├── auth/                 Sesión, perfil, permisos
    │   ├── actions.ts            Tipo ActionResult + traducción de errores de Postgres
    │   ├── format.ts             Formato de cantidades, moneda (RD$) y fechas (es-DO)
    │   └── utils.ts              `cn()` y utilidades genéricas
    ├── services/
    │   └── integrations/adm/     Capa desacoplada para ADM Cloud (sin implementación)
    └── types/
        └── database.ts           Tipos del esquema (formato `supabase gen types`)
```

### Reglas entre capas

- `app/` importa de `features/`, `components/` y `lib/`. Nunca contiene SQL ni
  reglas de negocio.
- `features/*/queries.ts` y `actions.ts` son los **únicos** lugares que hablan con
  Supabase. Los componentes reciben datos ya tipados.
- `components/ui` y `components/shared` no conocen el dominio.
- `services/integrations/*` no es importado por la UI: se invocará desde acciones
  o procesos programados cuando exista la integración.

## 6. Integridad del inventario y concurrencia

Esta es la prioridad absoluta del sistema.

**Modelo:** libro mayor (`inventory_movements`) + saldos cacheados en `materials`.

Cada operación de inventario (entrada, reserva, liberación, consumo, merma,
devolución, ajuste) es **una función PL/pgSQL** que, en una única transacción:

1. Verifica el permiso del usuario (`has_permission`).
2. Bloquea la fila del material: `SELECT … FROM materials WHERE id = $1 FOR UPDATE`.
   Dos usuarios que operen sobre el mismo material quedan serializados; ninguno
   lee un saldo desactualizado.
3. Calcula los nuevos saldos y valida invariantes:
   - `stock_reserved >= 0`
   - `stock_on_hand - stock_reserved >= 0` (disponible no negativo)
   - salvo excepción explícita de un usuario con permiso `inventory.allow_negative`
     (queda marcada en el movimiento y en auditoría).
4. Inserta el movimiento con saldos **antes/después** (físico y reservado).
5. Actualiza los saldos y el costo promedio del material.
6. Registra el evento en `audit_logs`.

Si cualquier paso falla, la transacción completa se revierte.

Cuando una operación toca varios materiales (p. ej., una entrada con varias
líneas), los materiales se bloquean en orden de `id` para evitar interbloqueos.

## 7. Seguridad

- **Autenticación:** Supabase Auth (email + contraseña). No hay registro público:
  los usuarios los crea un administrador desde la pantalla **Usuarios** con una
  contraseña temporal, que el usuario debe cambiar en su primer ingreso (D-023).
- **Autorización:** rol por usuario (`profiles.role_code`) y permisos por rol
  (`role_permissions`). La función SQL `has_permission('materials.manage')` se usa
  en las políticas RLS y en las RPC. La UI consulta los mismos permisos solo para
  ocultar acciones; nunca es la única barrera.
- **RLS** activado en todas las tablas. Usuarios inactivos no leen nada.
- **Validación doble:** zod en el cliente (UX) y en el servidor (Server Action),
  más `CHECK`/triggers/RPC en la base de datos.
- **Secretos:** solo `NEXT_PUBLIC_SUPABASE_URL` y la clave pública
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) llegan al navegador. La
  `SUPABASE_SERVICE_ROLE_KEY` es opcional y **solo del servidor**: la usa
  únicamente `src/lib/supabase/admin.ts` para crear cuentas y cambiar contraseñas
  en Supabase Auth, después de comprobar `users.manage` con la sesión del
  administrador (D-022). Todo lo demás (roles, estado, datos) usa el JWT del
  usuario y pasa por RLS.

### Roles

| Rol | Código | Uso típico |
|-----|--------|-----------|
| Administrador | `admin` | Todo, incluidas excepciones de stock negativo, usuarios y configuración. |
| Supervisor | `supervisor` | Catálogos, órdenes, ajustes, anulaciones, cierres. |
| Almacén | `warehouse` | Materiales, proveedores, entradas, reservas, despachos. |
| Producción | `production` | Registrar consumos y mermas en órdenes. |
| Consulta | `viewer` | Solo lectura y reportes. |

La matriz completa de permisos está en [BUSINESS_RULES.md](./BUSINESS_RULES.md#9-permisos).

## 7.1 Validación y manejo de errores

- **Formularios:** react-hook-form + el mismo esquema zod en cliente y Server
  Action. Los números se editan como texto (`inputMode="decimal"`, mejor en
  celulares que `type="number"`) y se convierten en el esquema
  (`src/lib/validation.ts`).
- **Server Actions** devuelven `ActionResult` (`ok` / `error` + `fieldErrors`);
  ante éxito redirigen con `?notice=` para mostrar una confirmación.
- **Errores de base de datos** (`src/lib/actions.ts → fromDatabaseError`): las
  reglas de negocio se lanzan en PL/pgSQL con mensajes en español
  (`SQLSTATE P0001`) y se muestran tal cual; los demás códigos (`42501`, `23505`,
  `23503`…) se traducen a mensajes comprensibles; lo inesperado se registra en el
  servidor y el usuario ve un mensaje genérico.
- **Páginas:** `error.tsx` (reintentar), `not-found.tsx`, `loading.tsx` con
  skeletons y estados vacíos con una acción clara.

## 7.2 Pruebas

| Nivel | Qué | Dónde |
|-------|-----|-------|
| Base de datos | 61 aserciones: permisos, RLS, stock negativo, costo promedio, anulación de entradas, catálogos, inmutabilidad, ciclo de vida de OT | `supabase/tests/inventory_rules_test.sql` (CI) |
| Concurrencia | Dos sesiones retirando el mismo material: la segunda espera el bloqueo y es rechazada con el saldo actualizado | Verificado manualmente; ver §6 |
| Aplicación | Formato, lint, typecheck y build | CI |
| Extremo a extremo | Login, dashboard, materias primas, proveedores, entradas (crear, anular), ajustes, movimientos, catálogos, usuarios (crear, cambio obligatorio de contraseña, restablecer, desactivar), permisos por rol, móvil | Verificado con Playwright contra GoTrue + PostgREST locales; automatizar en Fase 2 |

## 8. Integración futura con ADM Cloud

No se asume que ADM Cloud tenga API. Se prepara únicamente:

- `src/services/integrations/adm/` con **interfaces** (puertos) para clientes,
  proveedores, productos, órdenes y facturas, y un adaptador `NotConfigured` que
  falla de forma explícita. Ver su `README.md`.
- Columnas `external_source` / `external_id` en `customers`, `suppliers`,
  `materials` y `work_orders` para mapear registros sin acoplar el modelo.
- Opciones de integración a evaluar cuando exista documentación real: API REST,
  exportación/importación de archivos (CSV/Excel), o carga manual asistida.

## 9. Registro de decisiones (ADR)

| ID | Decisión | Motivo |
|----|----------|--------|
| D-001 | Next.js 16 App Router + Server Actions, sin API REST propia. | Menos piezas; la seguridad real está en RLS/RPC. |
| D-002 | Stock como **libro mayor inmutable** + saldos cacheados en `materials`. | Kardex exacto y consultas rápidas de inventario. |
| D-003 | Todas las mutaciones de stock vía funciones SQL `SECURITY DEFINER` con `FOR UPDATE`. | Atomicidad y serialización por material. |
| D-004 | Un movimiento guarda deltas y saldos **antes/después** del stock físico **y** del reservado. | La reserva no cambia el físico pero sí el disponible; el kardex debe explicar ambos. |
| D-005 | **Consumo = material útil**; **merma = desperdicio**. Ambos descuentan stock con movimientos distintos. Consumo total de una OT = consumo + merma. | Registro independiente de desperdicios sin doble conteo. |
| D-006 | Costeo por **costo promedio ponderado móvil**; las salidas se valoran al promedio vigente y ese costo queda congelado en el movimiento. | Estándar simple y auditable. |
| D-007 | Roles y permisos en tablas (`roles`, `role_permissions`), no en código. | Ajustables sin desplegar. |
| D-008 | Numeración de documentos (OT-000001, ENT-000001, MAT-0001) con tabla `document_sequences` bloqueada por fila. | Números consecutivos sin colisiones. |
| D-009 | Unidades en tabla `units` con `kind` y `decimals`. Cada material tiene **una unidad base**. `unit_conversions` existe pero aún no se usa. | Preparado para conversiones (rollo → m²) sin complejidad hoy. |
| D-010 | Se agrega tabla `customers` (no listada originalmente) con `external_id` hacia ADM. | Las OT y los reportes "consumo por cliente" necesitan un cliente referenciable. |
| D-011 | Se agrega tabla `locations` para ubicaciones de almacén. | La comparten materiales y retazos (futuro). |
| D-012 | Retazos (`remnants`) son un **sub-detalle** del stock físico: su área ya está incluida en `stock_on_hand`. | Evita doble conteo; permite saber qué piezas utilizables existen. |
| D-013 | Sin borrado físico de información crítica: sin políticas `DELETE`; anulación con motivo; triggers que bloquean `UPDATE/DELETE` en el libro mayor. | Auditoría obligatoria. |
| D-014 | Moneda única RD$ (DOP) configurable en `app_settings`. Cantidades `numeric(14,4)`, costos `numeric(18,4)`. | Precisión suficiente para m², ml y costos unitarios pequeños. |
| D-015 | Los componentes shadcn/ui se mantienen en el repositorio (`src/components/ui`). | Es el modelo de shadcn; no depende del registro en tiempo de build. |
| D-016 | La existencia inicial al crear un material se registra con el permiso `materials.manage` (no requiere `inventory.adjust`). Queda como ajuste `is_opening_balance = true`. | Almacén debe poder cargar el inventario inicial; los ajustes posteriores siguen restringidos a supervisor/admin. |
| D-017 | `last_cost` toma el costo de la existencia inicial mientras no haya compras (BR CST-02). | Evita mostrar RD$0.00 como último costo de materiales recién cargados. |
| D-018 | Agregaciones del dashboard en funciones SQL (`get_dashboard_summary`, `get_top_consumed_materials`). | Una sola consulta por indicador; no se envían movimientos al navegador. |
| D-019 | Listados con filtros, orden y paginación en la URL, resueltos en el servidor. | Enlaces compartibles, botón "atrás" funcional y escalable a miles de materiales. |
| D-020 | El formulario de entradas carga los materiales activos y filtra en el navegador. | Búsqueda instantánea y sin conexión entre teclas; adecuado hasta unos pocos miles de materiales. Si se supera, cambiar a búsqueda en el servidor. |
| D-021 | Anular una entrada es todo o nada y se bloquea si el material ya se consumió. | Evita stock negativo silencioso; el supervisor corrige con un ajuste si el material ya se usó. |
| D-022 | La creación de cuentas y el restablecimiento de contraseñas usan la `service_role` key en un módulo `server-only` (`lib/supabase/admin.ts`), solo después de verificar `users.manage` con la sesión del usuario. Rol, estado y nombre se cambian con la sesión del administrador (RLS + trigger), para que la auditoría registre quién lo hizo. Si la clave no está configurada, la pantalla funciona en modo limitado (sin crear usuarios). | Supabase Auth no permite crear usuarios sin privilegios de servicio; limitarla a un archivo del servidor reduce la superficie de riesgo. |
| D-023 | Usuarios nuevos reciben una contraseña temporal (no invitación por correo) y `profiles.must_change_password = true`; la app los lleva a cambiarla antes de usar el sistema. | El correo integrado de Supabase solo envía unos pocos mensajes por hora y únicamente a miembros del proyecto; así no depende de configurar SMTP. |
| D-024 | Consumo/merma de un material no planificado crea una línea en `work_order_materials` con `is_planned = false` y cantidad planificada 0. | Toda la ejecución de la OT se resume por línea (reservado, consumido, merma, costo real) sin casos especiales. |
| D-025 | Las transiciones de estado se validan en el trigger de `work_orders` y el estado solo se cambia con la RPC `change_work_order_status` (se retira el permiso de columna `status`). | Una sola fuente de reglas; cancelar y terminar liberan reservas en la misma transacción. |
| D-026 | `work_order_materials.actual_cost` y `work_orders.actual_material_cost` son caches que las RPC actualizan en cada consumo/merma (costo congelado del movimiento). | Estimado vs real disponible en todo momento, no solo al cerrar; el dashboard lo usa directamente. |
| D-027 | Orden de bloqueo en las RPC de órdenes: primero la fila de la OT, después los materiales (por `id`). | Evita interbloqueos cuando una cancelación libera varios materiales a la vez. |
| D-028 | Anular un consumo o una merma escribe un movimiento `return` al **costo congelado del registro** (recalcula el promedio como una entrada a ese costo), marca `voided_*` y descuenta los caches de la línea y el costo real de la OT. No recrea reservas. Solo con la OT En producción o En instalación (una OT cerrada se reabre primero, lo que queda auditado); requiere `inventory.void`. | El registro original no se borra ni se edita: el libro mayor muestra la corrección. Devolver al costo original deja el valor del inventario como si el consumo no hubiera ocurrido. |
| D-029 | La merma de almacén (sin OT) usa su propia RPC `register_warehouse_waste` con permiso `inventory.adjust`; descuenta solo del **disponible** (nunca de lo reservado por órdenes) y no admite la excepción de stock negativo. | Una merma de almacén es una corrección de inventario como un ajuste, pero con motivo de merma para que cuente en los reportes de desperdicio. Si el físico real es menor, se corrige con un ajuste. |
| D-030 | Reportes y alertas se calculan con funciones SQL `security invoker` sobre la vista `usage_records` (consumos y mermas **no anulados**). Los períodos son fechas del negocio (`America/Santo_Domingo`), inclusivas. El dashboard usa la misma vista. | Una sola definición de "consumo" en toda la app: las anulaciones (D-028) se descuentan en todos lados, y RLS sigue aplicando. |
| D-031 | Exportación como CSV (UTF-8 con BOM, separador coma, punto decimal) desde un Route Handler autenticado (`/reports/export`), no XLSX. | Excel lo abre directamente con acentos correctos; sin dependencias pesadas. XLSX se puede agregar después si hace falta formato. |
| D-032 | Los gráficos del dashboard se dibujan con HTML/CSS en el servidor (barras), con una tabla equivalente para lectores de pantalla; sin librería de gráficos. | Pocos gráficos y simples: no justifican una dependencia ni JavaScript extra en el cliente. Se reevalúa si se necesitan gráficos interactivos. |
