import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const session = request.cookies.get("session")?.value;

  // Paths that require authentication
  const protectedPaths = ["/", "/people", "/tree", "/statistics", "/import-export", "/settings", "/trees"];
  const isProtected = protectedPaths.some((path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  });

  // Auth pages (login/signup)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // If a clear parameter is present (e.g. stale session clean up), delete the session cookie
  if (searchParams.has("clear")) {
    const response = NextResponse.next();
    response.cookies.delete("session");
    return response;
  }

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
