import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.APPLE_CLIENT_ID;

  if (!clientId || clientId.startsWith("replace_")) {
    const url = new URL("/auth", req.url);
    url.searchParams.set("error", "Apple Sign-In is not configured yet.");
    return NextResponse.redirect(url);
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/apple/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code id_token",
    scope: "name email",
    response_mode: "form_post",
  });

  return NextResponse.redirect(
    `https://appleid.apple.com/auth/authorize?${params.toString()}`
  );
}
