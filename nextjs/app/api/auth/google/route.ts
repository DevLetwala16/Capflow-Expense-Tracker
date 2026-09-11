import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId.startsWith("replace_")) {
    // Redirect back to auth page with a clear error message
    const url = new URL("/auth", req.url);
    url.searchParams.set("error", "Google Sign-In is not configured yet. Please use Email OTP.");
    return NextResponse.redirect(url);
  }

  const redirectUri =
    process.env.GOOGLE_CALLBACK_URL ||
    `${req.nextUrl.origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
