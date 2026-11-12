import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor, type Role } from "@/lib/auth";

/**
 * Runs before every page request:
 * 1. Refreshes the Supabase session cookie (so drivers stay logged in).
 * 2. Sends logged-out users to /login.
 * 3. Sends each role to its own area (driver → /driver, owner → /owner).
 *    The role is copied into app_metadata by the seed script; data access
 *    itself is always enforced by RLS in the database.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!user) {
    return path === "/login" ? response : redirect("/login");
  }

  const home = homeFor(user.app_metadata?.role as Role | undefined);
  if (path === "/" || path === "/login") return redirect(home);
  if (path.startsWith("/owner") && home !== "/owner") return redirect(home);
  if (path.startsWith("/driver") && home !== "/driver") return redirect(home);

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals, PWA files and static images
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\.(?:png|svg|jpg|jpeg|webp|ico)$).*)",
  ],
};
