import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, logAdminAction, getAdminFromRequest } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleLogout(req);
}

export async function GET(req: NextRequest) {
  return handleLogout(req);
}

async function handleLogout(req: NextRequest) {
  const currentAdmin = getAdminFromRequest(req);

  if (currentAdmin) {
    await logAdminAction({
      action: "ADMIN_LOGOUT",
      adminEmail: currentAdmin.email,
      targetType: "Auth",
      details: { reason: "Explicit admin logout" },
      req,
    });
  }

  const response = NextResponse.json({
    success: true,
    message: "Admin session destroyed successfully",
    redirectUrl: "/admin/login",
  });

  // Clear HTTP-Only session cookies
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("capflow_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
