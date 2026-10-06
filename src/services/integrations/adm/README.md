# Integración con ADM Cloud (futura)

> **Estado:** no implementada. Esta carpeta solo define contratos.
> No se asume que ADM Cloud tenga una API. No se inventan endpoints.

## Reparto de responsabilidades

| Sistema | Responsable de |
|---------|----------------|
| **ADM Cloud** | Facturación, contabilidad, cuentas por cobrar, clientes (maestro), procesos administrativos |
| **Workflow** | Materia prima, inventario, órdenes de trabajo, consumos, mermas, costo real por trabajo |

## Diseño

- **Puerto** `AdmIntegration` (`adm-integration.ts`): lo que Workflow necesitaría de ADM.
- **Adaptador por defecto** `NotConfiguredAdmIntegration`: lanza un error explícito.
- **Punto de entrada** `getAdmIntegration()` (`index.ts`, solo servidor).
- **Mapeo en base de datos:** `customers`, `suppliers`, `materials` y `work_orders`
  tienen `external_source` (`'adm_cloud'`) y `external_id`, únicos por fuente.
  Así un registro de Workflow puede vincularse a ADM sin cambiar el modelo.

La UI nunca importa esta carpeta directamente: la usarán Server Actions o procesos
programados cuando exista el adaptador.

## Posibles puntos de integración

| # | Punto | Dirección | Uso en Workflow | Preguntas abiertas |
|---|-------|-----------|-----------------|--------------------|
| 1 | Clientes | ADM → Workflow | Seleccionar cliente al crear una OT | ¿ADM expone clientes? ¿Identificador estable? |
| 2 | Proveedores | ADM → Workflow | Proveedor en entradas y material | ¿Mismo catálogo que en compras? |
| 3 | Productos | ADM → Workflow | Vincular materiales con artículos de ADM | ¿ADM maneja materia prima como artículos? ¿Unidades? |
| 4 | Facturas de compra | ADM → Workflow | Crear entradas de inventario sin doble digitación | ¿Se registran compras en ADM? ¿Con detalle por línea? |
| 5 | Órdenes / facturas de venta | Workflow → ADM | Costo real de materiales por trabajo | ¿ADM acepta costos por orden? ¿Por archivo o API? |

## Alternativas según lo que ofrezca ADM

1. **API documentada** → adaptador HTTP en `adm-api-adapter.ts`, credenciales solo
   en variables de entorno del servidor (nunca `NEXT_PUBLIC_*`).
2. **Exportación de archivos (Excel/CSV)** → importador que lee el archivo y usa
   los mismos tipos de `types.ts`.
3. **Sin integración técnica** → carga manual asistida (importación desde Excel).

## Antes de implementar

1. Obtener documentación técnica oficial de ADM Cloud.
2. Registrar la decisión en `docs/ARCHITECTURE.md` (ADR).
3. Implementar el adaptador y pruebas con datos reales anonimizados.
