import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.FACEBOOK_APP_ID;

  if (!clientId || clientId.startsWith("replace_")) {
    const url = new URL("/auth", req.url);
    url.searchParams.set("error", "Facebook Sign-In is not configured yet.");
    return NextResponse.redirect(url);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "email,public_profile",
    state,
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
