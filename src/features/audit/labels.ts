/** Spanish names for audited tables and business events. */
export const AUDIT_ENTITIES: Record<string, string> = {
  materials: "Materias primas",
  inventory_receipts: "Entradas",
  inventory_adjustments: "Ajustes",
  work_orders: "Órdenes de trabajo",
  work_order_materials: "Materiales de órdenes",
  material_consumptions: "Consumos",
  waste_records: "Mermas",
  suppliers: "Proveedores",
  customers: "Clientes",
  categories: "Categorías",
  units: "Unidades",
  locations: "Ubicaciones",
  profiles: "Usuarios",
  role_permissions: "Permisos",
  app_settings: "Configuración",
};

const ACTIONS: Record<string, string> = {
  insert: "Creó",
  update: "Modificó",
  delete: "Eliminó",
  "materials.import": "Importó materiales",
  "inventory.receipt.posted": "Registró una entrada",
  "inventory.receipt.voided": "Anuló una entrada",
  "inventory.adjustment.created": "Registró un ajuste",
  "inventory.negative_override": "Autorizó stock negativo",
  "inventory.warehouse_waste": "Registró merma de almacén",
  "inventory.waste.voided": "Anuló una merma",
  "work_orders.consumption.voided": "Anuló un consumo",
};

export function auditActionLabel(action: string) {
  return ACTIONS[action] ?? action;
}

/** Fields that change on every write and add no information. */
export const IGNORED_FIELDS = new Set(["updated_at", "updated_by"]);
