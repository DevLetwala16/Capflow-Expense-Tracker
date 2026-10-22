import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb/connection";
import { PushSubscription } from "@/lib/mongodb/pushSubscriptionModel";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId, email } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    await connectMongoDB();

    // Check optional token if user is signed in
    let resolvedUserId = userId;
    let resolvedEmail = email;

    const tokenCookie = req.cookies.get("capflow_token")?.value;
    if (tokenCookie && process.env.JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(tokenCookie, secret);
        if (payload?.userId) resolvedUserId = String(payload.userId);
        if (payload?.email) resolvedEmail = String(payload.email);
      } catch {
        // use fallback from body
      }
    }

    const userAgent = req.headers.get("user-agent") || undefined;

    const updated = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          userId: resolvedUserId,
          email: resolvedEmail ? resolvedEmail.toLowerCase().trim() : undefined,
          userAgent,
          active: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, subscriptionId: updated._id });
  } catch (error: any) {
    console.error("[API] Push Subscription POST error:", error);
    return NextResponse.json({ error: "Failed to store push subscription", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await connectMongoDB();
    await PushSubscription.findOneAndUpdate({ endpoint }, { $set: { active: false } });

    return NextResponse.json({ success: true, message: "Subscription deactivated" });
  } catch (error: any) {
    console.error("[API] Push Subscription DELETE error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe", details: error.message }, { status: 500 });
  }
}
