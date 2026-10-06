import type {
  AdmCustomer,
  AdmProduct,
  AdmPurchaseInvoice,
  AdmSupplier,
  WorkOrderCostSummary,
} from "./types";

/**
 * Port (interface) for the future ADM Cloud integration. Each method is an
 * integration point identified with the business; none is implemented yet.
 */
export interface AdmIntegration {
  /** Is an adapter configured? UI should hide integration actions when false. */
  readonly isConfigured: boolean;

  /** Customers: ADM is the master; Workflow keeps a copy for work orders. */
  fetchCustomers(): Promise<AdmCustomer[]>;

  /** Suppliers: same approach as customers. */
  fetchSuppliers(): Promise<AdmSupplier[]>;

  /** Products: map ADM items to Workflow materials (not 1:1 guaranteed). */
  fetchProducts(): Promise<AdmProduct[]>;

  /** Purchases: import supplier invoices as inventory receipts. */
  fetchPurchaseInvoices(since: Date): Promise<AdmPurchaseInvoice[]>;

  /** Orders/billing: hand the real cost of a closed order to ADM. */
  exportWorkOrderCost(summary: WorkOrderCostSummary): Promise<void>;
}

export class AdmIntegrationNotConfiguredError extends Error {
  constructor() {
    super(
      "La integración con ADM Cloud aún no está disponible. Se implementará cuando exista documentación técnica oficial.",
    );
    this.name = "AdmIntegrationNotConfiguredError";
  }
}

/** Default adapter: fails explicitly instead of pretending to sync. */
export class NotConfiguredAdmIntegration implements AdmIntegration {
  readonly isConfigured = false;

  private fail(): never {
    throw new AdmIntegrationNotConfiguredError();
  }

  async fetchCustomers(): Promise<AdmCustomer[]> {
    return this.fail();
  }
  async fetchSuppliers(): Promise<AdmSupplier[]> {
    return this.fail();
  }
  async fetchProducts(): Promise<AdmProduct[]> {
    return this.fail();
  }
  async fetchPurchaseInvoices(): Promise<AdmPurchaseInvoice[]> {
    return this.fail();
  }
  async exportWorkOrderCost(): Promise<void> {
    return this.fail();
  }
}
