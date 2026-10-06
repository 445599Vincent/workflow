/**
 * Public runtime configuration. Only NEXT_PUBLIC_* values belong here: they are
 * inlined into the browser bundle. Never add the service_role key.
 *
 * Values are read lazily so that importing a module never fails at build time;
 * a missing variable fails loudly on first use instead.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copie .env.example a .env.local y complétela.`,
    );
  }
  return value;
}

export function getSupabaseConfig() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * SERVER ONLY. Optional key that lets administrators create accounts and set
 * passwords in Supabase Auth (D-022). Never prefix it with NEXT_PUBLIC_.
 */
export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}
