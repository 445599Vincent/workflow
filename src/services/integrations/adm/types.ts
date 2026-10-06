/**
 * ADM Cloud integration — contracts only.
 *
 * Nothing here talks to ADM Cloud. These types describe the data Workflow
 * would exchange, expressed in Workflow's own terms. When real technical
 * documentation for ADM Cloud exists (API, file export, or other), an adapter
 * will implement `AdmIntegration` and map ADM's format to these shapes.
 * Do NOT add endpoint URLs or field names guessed from ADM Cloud.
 */

/** Where a record originated. Stored in `external_source` columns. */
export const ADM_SOURCE = "adm_cloud" as const;

/** Reference to a record in ADM Cloud (stored in `external_id` columns). */
export type ExternalRef = {
  source: typeof ADM_SOURCE;
  externalId: string;
};

export type AdmCustomer = {
  externalId: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type AdmSupplier = AdmCustomer;

export type AdmProduct = {
  externalId: string;
  code: string;
  name: string;
  unit?: string | null;
};

/** Summary of a closed work order that billing could use. */
export type WorkOrderCostSummary = {
  workOrderNumber: string;
  customerExternalId: string | null;
  estimatedMaterialCost: number;
  actualMaterialCost: number;
  completedAt: string;
};

/** A purchase invoice registered in ADM that could become a Workflow receipt. */
export type AdmPurchaseInvoice = {
  externalId: string;
  invoiceNumber: string;
  supplierExternalId: string | null;
  issuedAt: string;
  lines: { productExternalId: string; quantity: number; unitCost: number }[];
};

export type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { externalId: string; message: string }[];
};
