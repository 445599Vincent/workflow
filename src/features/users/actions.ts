"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  fromDatabaseError,
  GENERIC_ERROR,
  ok,
  validationFailed,
  type ActionResult,
} from "@/lib/actions";
import { can, getCurrentUser } from "@/lib/auth/session";
import { createAdminAuthClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  type CreateUserValues,
  type ResetPasswordValues,
  type UpdateUserValues,
} from "./schemas";

const NOT_CONFIGURED =
  "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios o cambiar contraseñas.";

/** The caller's own session must hold users.manage before any admin call (D-022). */
async function requireUsersManager() {
  const user = await getCurrentUser();
  return user && can(user, "users.manage") ? user : null;
}

function authErrorMessage(error: { code?: string; status?: number; message: string }): string {
  if (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    error.status === 422
  ) {
    return "Ya existe un usuario con ese correo.";
  }
  if (error.code === "weak_password") return "La contraseña es muy débil. Genere otra.";
  console.error("[users] auth admin", error.code, error.message);
  return GENERIC_ERROR;
}

/**
 * Creates the Supabase Auth account with a temporary password (confirmed
 * e-mail), then sets name/role and the forced password change on the profile
 * with the administrator's own session, so the audit log records who did it.
 */
export async function createUser(
  values: CreateUserValues,
): Promise<ActionResult<{ email: string }>> {
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  if (!(await requireUsersManager())) return fail("No tiene permiso para administrar usuarios.");

  const admin = createAdminAuthClient();
  if (!admin) return fail(NOT_CONFIGURED);
  const input = parsed.data;

  const { data: created, error: authError } = await admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authError || !created.user) {
    const message = authErrorMessage(authError ?? { message: "no user returned" });
    return message.startsWith("Ya existe")
      ? fail("Revise los campos marcados.", { email: [message] })
      : fail(message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName, role_code: input.roleCode, must_change_password: true })
    .eq("id", created.user.id);
  if (error) {
    // The account exists with the default (read-only) role; report it clearly.
    console.error("[users] profile after create", error.code, error.message);
    return fail("El usuario se creó, pero no se pudo asignar el rol. Edítelo para asignarlo.");
  }

  revalidatePath("/users");
  return ok({ email: input.email });
}

/** Name, role and active flag; RLS + trigger forbid changing your own role/status. */
export async function updateUser(id: string, values: UpdateUserValues): Promise<ActionResult> {
  const parsed = updateUserSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName, role_code: input.roleCode, is_active: input.isActive })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fromDatabaseError(error);
  if (!data) return fail("No tiene permiso para administrar usuarios.");

  // Also block sign-in at the Auth level when possible (RLS already hides all data).
  const admin = createAdminAuthClient();
  if (admin) {
    const { error: banError } = await admin.updateUserById(id, {
      ban_duration: input.isActive ? "none" : "876000h",
    });
    if (banError) console.error("[users] ban sync", banError.code, banError.message);
  }

  revalidatePath("/users");
  return ok(undefined);
}

/** Sets a new temporary password and forces the user to change it. */
export async function resetUserPassword(
  id: string,
  values: ResetPasswordValues,
): Promise<ActionResult<{ temporaryPassword: string }>> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return validationFailed(parsed.error);
  const manager = await requireUsersManager();
  if (!manager) return fail("No tiene permiso para administrar usuarios.");
  if (manager.id === id)
    return fail("Para cambiar su propia contraseña use la opción de su perfil.");

  const admin = createAdminAuthClient();
  if (!admin) return fail(NOT_CONFIGURED);

  const { error: authError } = await admin.updateUserById(id, {
    password: parsed.data.temporaryPassword,
  });
  if (authError) return fail(authErrorMessage(authError));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", id);
  if (error) return fromDatabaseError(error);

  revalidatePath("/users");
  return ok({ temporaryPassword: parsed.data.temporaryPassword });
}
