import "server-only";

import { NotConfiguredAdmIntegration, type AdmIntegration } from "./adm-integration";

export type { AdmIntegration } from "./adm-integration";
export { AdmIntegrationNotConfiguredError } from "./adm-integration";
export * from "./types";

/**
 * Single entry point. When a real adapter exists, choose it here (e.g. from
 * server-side environment variables); callers do not change.
 */
export function getAdmIntegration(): AdmIntegration {
  return new NotConfiguredAdmIntegration();
}
