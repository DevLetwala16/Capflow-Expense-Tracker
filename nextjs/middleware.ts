import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("capflow_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Allow internal Next.js requests, API routes, and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // /onboarding is a special post-login welcome page — always allow through
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  const isAuthPage =
    pathname.startsWith("/auth") || pathname.startsWith("/splash");

  // 2. Root path handling
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/splash", request.url));
  }

  // 3. If authenticated user tries to access auth pages, redirect to dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. If unauthenticated user tries to access protected app pages, redirect to auth
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (e.g. .png, .jpg, .svg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
