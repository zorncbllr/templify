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

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session — required for SSR auth to work correctly
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected paths
  if (!user && isProtected(pathname)) {
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
    const country = request.headers.get("x-vercel-ip-country");
    const locale = country === "PH" ? "ph" : "intl";
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
