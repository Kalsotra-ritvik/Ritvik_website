import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: send visitors without a session cookie straight to
 * the login page. The real check (session lookup in the database) happens in
 * every admin page, Server Action and Route Handler.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/preview/")) return NextResponse.next();
  const hasCookie = request.cookies.has("__Host-rk_admin") || request.cookies.has("rk_admin");
  if (!hasCookie) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
