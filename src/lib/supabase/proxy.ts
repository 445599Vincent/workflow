import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path));
}

/**
 * Refreshes the Supabase session cookies on every request and guards routes:
 * anonymous users go to /login, signed-in users skip the login page.
 */
export async function updateSession(request: NextRequest) {
  let config: ReturnType<typeof getSupabaseConfig>;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    return configurationErrorPage(error);
  }
  const { url, publishableKey } = config;
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it validates
  // the JWT and triggers the token refresh when needed.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    return redirectWithCookies(url, response);
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Redirect while preserving any refreshed auth cookies. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/**
 * A deployment without the Supabase variables would only show "Internal
 * Server Error". Explain what is missing (names only, never values).
 */
function configurationErrorPage(error: unknown) {
  const detail =
    (error instanceof Error ? error.message.split(".")[0] : undefined) ??
    "Configuración incompleta";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Configuración incompleta · Workflow</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f7fb;color:#0f1e33;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:34rem;background:#fff;border:1px solid #e3e8f0;border-radius:12px;padding:24px}h1{font-size:1.25rem;margin:0 0 8px}
p{line-height:1.5;color:#5b6b82}code{background:#f1f4f9;padding:2px 6px;border-radius:4px;color:#0f1e33}</style></head>
<body><main><h1>Configuración incompleta</h1>
<p><code>${detail.replace(/[<>&]/g, "")}</code>.</p>
<p>En Vercel: <strong>Settings → Environment Variables</strong>, agregue <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> para <em>Production</em> y vuelva a publicar (<strong>Redeploy</strong>).</p>
</main></body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
