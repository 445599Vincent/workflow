# Workflow — Roadmap

Desarrollo incremental. Cada fase entrega algo usable y se valida con el equipo
antes de continuar. Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente.

## Fase 0 — Análisis y diseño ✅

- ✅ Análisis del repositorio (estaba vacío; ver ARCHITECTURE §2)
- ✅ `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/BUSINESS_RULES.md`, `docs/ROADMAP.md`
- ✅ README actualizado

## Fase 1 — Fundación 🟡

- ✅ Proyecto Next.js 16 + TypeScript estricto + Tailwind 4 + shadcn/ui
- ✅ Paleta y tokens de diseño de Workflow
- ✅ Clientes Supabase (navegador, servidor, proxy) y protección de rutas
- ✅ Login, recuperación y restablecimiento de contraseña, cierre de sesión
- ✅ Layout: sidebar (colapsable en móvil), header, menú de usuario
- ✅ Esquema inicial completo (migraciones 001–007) con RLS y RPC de inventario (entradas y ajustes listos en BD; falta su interfaz)
- ✅ Roles y permisos en base de datos; permisos expuestos a la UI
- ✅ Dashboard inicial (KPIs reales desde `get_dashboard_summary`)
- ⬜ Pantalla de Usuarios (invitar, asignar rol, desactivar) — por ahora vía panel de Supabase + SQL (ver README)
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
- ✅ Pruebas automáticas de reglas de base de datos (`supabase/tests/inventory_rules_test.sql`, 59 aserciones, en CI)

## Fase 3 — Órdenes de trabajo ⬜

- ⬜ Clientes (CRUD mínimo)
- ⬜ Órdenes: crear, editar, cambiar estado, timeline
- ⬜ Materiales planificados
- ⬜ RPC: `reserve_material`, `release_reservation`, `consume_material`, `register_waste`, `change_work_order_status`, `close_work_order`
- ⬜ Pantalla de producción simplificada (registrar consumo/merma desde tablet/celular)
- ⬜ Cierre con resumen estimado vs real

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

1. Crear el proyecto Supabase de producción, aplicar migraciones y crear el primer administrador (README).
2. Conectar Vercel y validar con el equipo de almacén el flujo completo de inventario con datos reales.
3. Pantalla de Usuarios (cierra la Fase 1) y comenzar la Fase 3: órdenes de trabajo.

## Pendientes de decisión con el negocio

1. ¿Las entradas requieren aprobación de un supervisor o se registran directamente?
2. ¿Quién puede reabrir una OT terminada?
3. Umbrales de alerta definitivos (variación de consumo y merma).
4. ¿Se manejarán varios almacenes/sucursales? (hoy: un almacén con ubicaciones)
5. Lista definitiva de categorías y unidades.
