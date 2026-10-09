import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = req.nextUrl;
    const code = searchParams.get("code");

    if (!code) {
      const url = new URL("/auth", req.url);
      url.searchParams.set("error", "Facebook sign-in was cancelled.");
      return NextResponse.redirect(url);
    }

    const clientId = process.env.FACEBOOK_APP_ID!;
    const clientSecret = process.env.FACEBOOK_APP_SECRET!;
    const redirectUri = `${origin}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }).toString()
    );

    if (!tokenRes.ok) {
      throw new Error("Failed to exchange code for access token");
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Fetch user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
    );

    if (!profileRes.ok) {
      throw new Error("Failed to fetch Facebook profile");
    }

    const profile = await profileRes.json();
    const { id: facebookId, name, email } = profile as { id: string; name: string; email?: string };

    if (!facebookId) {
      throw new Error("Facebook profile missing ID");
    }

    await connectMongoDB();

    // Upsert user — find by facebookId first, then by email if available
    let user = await User.findOne({ facebookId });

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      // Link facebookId to existing account if not already set
      if (!user.facebookId) user.facebookId = facebookId;
      if (name && !user.name) user.name = name;
      await user.save();
    } else {
      // Create new user — email might be absent for some Facebook accounts
      user = await User.create({
        email: email ? email.toLowerCase() : `fb_${facebookId}@facebook.invalid`,
        name: name || "Facebook User",
        facebookId,
        avatar: `https://graph.facebook.com/${facebookId}/picture?type=large`,
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
    console.error("[Facebook callback]", err);
    const url = new URL("/auth", req.url);
    url.searchParams.set(
      "error",
      err instanceof Error ? err.message : "Facebook sign-in failed. Please try again."
    );
    return NextResponse.redirect(url);
  }
}
