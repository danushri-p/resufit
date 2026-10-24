import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideAuth } from "@/lib/auth/routes";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  // Accounts are not configured (local development, CI): keep the app open.
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verifies the session (refreshing it when needed) before any page or AI route runs.
  const { data } = await supabase.auth.getClaims();
  const decision = decideAuth(
    request.nextUrl.pathname,
    request.nextUrl.search,
    Boolean(data?.claims?.sub),
  );

  if (decision.action === "unauthorized") {
    return NextResponse.json({ error: "Please log in to use ResuFit." }, { status: 401 });
  }
  if (decision.action === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    // Keep any refreshed session cookies.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except build assets, the service worker, and icons/images.
    "/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest|icon\\.svg|apple-icon|opengraph-image|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
