import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role_code, is_active, must_change_password, created_at")
    .order("is_active", { ascending: false })
    .order("full_name");
  if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
  return data;
}
export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

export async function listRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("code, name, description")
    .order("sort_order");
  if (error) throw new Error(`No se pudieron cargar los roles: ${error.message}`);
  return data;
}
export type RoleOption = Awaited<ReturnType<typeof listRoles>>[number];
