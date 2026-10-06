import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNextPath } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing route for Supabase e-mail links (password recovery, invitations).
 * Supports both the token-hash template ({{ .TokenHash }}) and the PKCE code
 * flow used by the default template.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let error: unknown = new Error("missing token");

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }

  const destination = error ? "/login?error=link" : next;
  return NextResponse.redirect(new URL(destination, request.url));
}
