# Workflow — Roadmap

Desarrollo incremental. Cada fase entrega algo usable y se valida con el equipo
antes de continuar. Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente.

## Fase 0 — Análisis y diseño ✅

- ✅ Análisis del repositorio (estaba vacío; ver ARCHITECTURE §2)
- ✅ `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/BUSINESS_RULES.md`, `docs/ROADMAP.md`
- ✅ README actualizado

## Fase 1 — Fundación ✅

- ✅ Proyecto Next.js 16 + TypeScript estricto + Tailwind 4 + shadcn/ui
- ✅ Paleta y tokens de diseño de Workflow
- ✅ Clientes Supabase (navegador, servidor, proxy) y protección de rutas
- ✅ Login, recuperación y restablecimiento de contraseña, cierre de sesión
- ✅ Layout: sidebar (colapsable en móvil), header, menú de usuario
- ✅ Esquema inicial completo (migraciones 001–007) con RLS y RPC de inventario (entradas y ajustes listos en BD; falta su interfaz)
- ✅ Roles y permisos en base de datos; permisos expuestos a la UI
- ✅ Dashboard inicial (KPIs reales desde `get_dashboard_summary`)
- ✅ Pantalla de Usuarios: crear con contraseña temporal, asignar rol, activar/desactivar, restablecer contraseña
- ✅ CI en GitHub Actions (formato, lint, typecheck, build, migraciones y pruebas de BD)

## Fase 2 — Inventario ✅

- ✅ Materias primas v1: listar, buscar, filtrar, ordenar, paginar, crear (con existencia inicial), editar, consultar
- ✅ Kardex (consulta en el detalle del material)
- ✅ Categorías, unidades y ubicaciones (Configuración: crear, editar, desactivar)
- ✅ Proveedores: listar, buscar, crear, editar, desactivar, detalle con materiales y entradas
- ✅ Entradas de inventario: formulario multi-línea con buscador de materiales, listado con filtros, detalle
- ✅ Ajustes de inventario con motivo, vista previa y excepción de stock negativo solo para administrador
- ✅ Movimientos: libro mayor global con búsqueda y filtros por tipo y fecha
- ✅ Anulación de entradas (`void_inventory_receipt`, con motivo y reverso del costo promedio)
- ✅ Pruebas automáticas de reglas de base de datos (`supabase/tests/inventory_rules_test.sql`, en CI)

## Fase 3 — Órdenes de trabajo ✅

- ✅ Clientes: listar, buscar, crear, editar, desactivar
- ✅ Órdenes: listar con filtros (abiertas, atrasadas, por estado, cliente), crear, editar
- ✅ Materiales planificados: agregar, cambiar cantidad estimada, quitar (si no tiene movimientos)
- ✅ Migración 011 y RPC: `reserve_material`, `release_reservation`, `consume_material`,
  `register_waste`, `change_work_order_status` (el cierre es un cambio de estado, D-025)
- ✅ Reservas: el consumo usa primero lo reservado; al terminar o cancelar se liberan las sobrantes
- ✅ Consumo y merma por línea o de cualquier material (línea "no planificada", D-024)
- ✅ Costo real en vivo (consumo + merma) y variación contra el umbral configurado
- ✅ Estados: avanzar, retroceder un paso, terminar con resumen, cancelar con motivo, reabrir (administrador)
- ✅ Historial de la orden (estados, planificación, reservas, consumos, mermas)
- ✅ Uso desde tablet/celular en la página de la orden (botones por material)
- ✅ Pruebas de BD de la ejecución (transiciones, reservas, consumo, merma, cierre, roles, invariantes del libro)

## Fase 3b — Correcciones y merma de almacén ✅

- ✅ Migración 012: `void_consumption`, `void_waste`, `register_warehouse_waste` (D-028, D-029)
- ✅ Anular consumos y mermas desde la orden (con motivo; devolución al mismo costo)
- ✅ Pantalla Mermas (`/movements/waste`): mermas de órdenes y de almacén, filtros y total
- ✅ Merma de almacén sin orden, solo del disponible
- ✅ Filtro "Asignadas a mí" en órdenes

## Fase 4 — Analítica ⬜

- ⬜ Dashboard completo (costo estimado vs real, materiales de mayor consumo, gráficos)
- ⬜ Centro de alertas (ALR-01…04)
- ⬜ Reportes: inventario actual, bajo mínimo, consumo por período/material/orden/cliente,
  merma por material/orden, costo por orden, estimado vs real, movimientos
- ⬜ Exportación a Excel/CSV
- ⬜ Visor de auditoría

## Fase 5 — Funcionalidades avanzadas ⬜

- ⬜ Retazos (tabla `remnants` ya creada)
- ⬜ Códigos QR para materiales y retazos
- ⬜ Adjuntos con Supabase Storage (tabla `attachments` ya creada)
- ⬜ Importación desde Excel (catálogo inicial de materiales)
- ⬜ Conversiones de unidades (tabla `unit_conversions` ya creada)
- ⬜ Integración ADM Cloud (requiere documentación técnica real)

## Siguiente paso recomendado

1. Aplicar las migraciones 011 y 012 en Supabase de producción (README → Actualizar una base ya instalada).
2. Validar con producción el flujo completo de una orden real: planificar, reservar, consumir,
   registrar merma y terminar; revisar el costo real contra lo esperado.
3. Fase 4: reportes, alertas y dashboard de costos.

## Pendientes de decisión con el negocio

1. ¿Las entradas requieren aprobación de un supervisor o se registran directamente?
2. ¿Quién puede reabrir una OT terminada? (hoy: Administrador, permiso `work_orders.reopen`)
3. Umbrales de alerta definitivos (variación de consumo y merma).
4. ¿Se manejarán varios almacenes/sucursales? (hoy: un almacén con ubicaciones)
5. Lista definitiva de categorías y unidades.
