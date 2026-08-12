import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = [
  "/dashboard",
  "/projects",
  "/settings",
  "/payment-success",
];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedRoute = isProtected(pathname);

  // Only call Supabase when we actually need the user identity.
  // Public routes (/, /pricing, /sandbox) skip the network round-trip.
  const needUser = protectedRoute || pathname === "/login";
  let user: { id: string } | null = null;
  let supabase: ReturnType<typeof createMiddlewareClient>["supabase"] | null =
    null;
  let response: NextResponse;

  if (needUser) {
    const client = createMiddlewareClient(request);
    supabase = client.supabase;
    response = client.response;
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } else {
    response = NextResponse.next({ request });
  }

  // Redirect unauthenticated users away from protected paths
  if (!user && protectedRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from the login page
  if (user && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Locale detection via Vercel IP country header
  // Only set once — don't override a locale the user has already chosen
  if (!request.cookies.get("locale")) {
    const country = request.headers.get("x-vercel-ip-country") ?? "PH";
    const locale = country === "PH" ? "ph" : "intl";
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    // Sync detected locale to the user's profile
    if (user && supabase) {
      supabase
        .from("profiles")
        .update({ locale })
        .eq("id", user.id)
        .then(
          () => {},
          () => {},
        );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
