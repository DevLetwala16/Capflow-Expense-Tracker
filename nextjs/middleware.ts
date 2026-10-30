import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTokenAdmin(token?: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed.role === "admin") {
      if (parsed.exp && Date.now() >= parsed.exp * 1000) return false;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("capflow_token")?.value;
  const adminToken = request.cookies.get("capflow_admin_token")?.value;
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

  // 2. Dedicated Admin Portal Protection
  if (pathname.startsWith("/admin")) {
    const isAdmin = isTokenAdmin(adminToken) || isTokenAdmin(token);

    if (pathname === "/admin/login") {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (pathname === "/admin" || pathname === "/admin/") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

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
