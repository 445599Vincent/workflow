import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServiceRoleKey, getSupabaseConfig } from "@/lib/env";

/**
 * Supabase Auth admin API (service role). Used ONLY by features/users/actions
 * to create accounts and set passwords, after checking users.manage with the
 * caller's own session (D-022). It bypasses RLS: never use it to read or write
 * application data. Returns null when the key is not configured.
 */
export function createAdminAuthClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) return null;
  const { url } = getSupabaseConfig();
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth.admin;
}

export function isAdminAuthConfigured(): boolean {
  return getServiceRoleKey() !== null;
}
