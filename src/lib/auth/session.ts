import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isPermission, type Permission } from "@/lib/auth/permissions";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  permissions: ReadonlySet<Permission>;
};

/**
 * Signed-in user with profile and permissions, or null. Deduplicated per
 * request with React cache(), so layouts and pages can all call it.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: permissions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role_code, is_active")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("current_user_permissions"),
  ]);

  // RLS hides every row from inactive users, including their own profile.
  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || profile.email,
    roleCode: profile.role_code,
    permissions: new Set((permissions ?? []).filter(isPermission)),
  };
});

/**
 * For authenticated pages. A valid auth session whose profile is missing or
 * inactive is signed out through /auth/inactive.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims?.sub ? "/auth/inactive" : "/login");
}

export function can(user: CurrentUser | null, permission: Permission): boolean {
  return Boolean(user?.permissions.has(permission));
}

/** For pages restricted to a permission: renders the 403 page otherwise. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/forbidden");
  return user;
}
