import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

/**
 * Decodes the Apple id_token JWT payload without signature verification.
 * For MVP — full verification requires fetching Apple's public JWKS.
 */
function decodeAppleIdToken(idToken: string): { sub: string; email?: string } {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("Invalid id_token format");
  const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payload) as { sub: string; email?: string };
}

// Apple uses form_post, so the callback is a POST request
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const code = formData.get("code") as string | null;
    const idToken = formData.get("id_token") as string | null;
    // Apple sends user JSON only on first login
    const userJson = formData.get("user") as string | null;

    if (!idToken) {
      const url = new URL("/auth", req.url);
      url.searchParams.set("error", "Apple sign-in was cancelled or failed.");
      return NextResponse.redirect(url);
    }

    // Decode id_token to get sub (appleId) and email
    const { sub: appleId, email: tokenEmail } = decodeAppleIdToken(idToken);

    if (!appleId) {
      throw new Error("Apple id_token missing subject claim");
    }

    // Apple may include name in the user JSON on the first login
    let firstName = "";
    let lastName = "";
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson) as {
          name?: { firstName?: string; lastName?: string };
        };
        firstName = parsed.name?.firstName ?? "";
        lastName = parsed.name?.lastName ?? "";
      } catch {
        // ignore parse errors — name fields are optional
      }
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Apple User";
    const email = tokenEmail ?? null;

    await connectMongoDB();

    // Upsert: find by appleId first, then by email
    let user = await User.findOne({ appleId });

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      if (!user.appleId) user.appleId = appleId;
      await user.save();
    } else {
      user = await User.create({
        email: email ? email.toLowerCase() : `apple_${appleId}@privaterelay.appleid.com`,
        name: fullName,
        appleId,
      });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "90d" }
    );

    const dashboardUrl = new URL("/dashboard", req.url);
    const response = NextResponse.redirect(dashboardUrl);

    response.cookies.set("capflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Apple callback]", err);
    const url = new URL("/auth", req.url);
    url.searchParams.set(
      "error",
      err instanceof Error ? err.message : "Apple sign-in failed. Please try again."
    );
    return NextResponse.redirect(url);
  }
}
