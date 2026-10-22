import webpush from "web-push";
import { connectMongoDB } from "@/lib/mongodb/connection";
import { PushSubscription, IPushSubscriptionDoc } from "@/lib/mongodb/pushSubscriptionModel";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:dev.lethwala@gmail.com";

let vapidConfigured = false;

export function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured in environment variables.");
    return false;
  }
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[WebPush] Failed to configure VAPID:", err);
    return false;
  }
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  vibrate?: number[];
  requireInteraction?: boolean;
}

export async function sendWebPushToUsers({
  userIds = [],
  emails = [],
  broadcast = false,
  payload,
}: {
  userIds?: string[];
  emails?: string[];
  broadcast?: boolean;
  payload: WebPushPayload;
}): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  await connectMongoDB();

  let query: any = { active: true };
  if (!broadcast) {
    const conditions: any[] = [];
    if (userIds.length > 0) {
      conditions.push({ userId: { $in: userIds } });
    }
    if (emails.length > 0) {
      const lowerEmails = emails.map((e) => e.toLowerCase());
      conditions.push({ email: { $in: lowerEmails } });
    }

    if (conditions.length === 0) {
      return { sent: 0, failed: 0 };
    }
    query = { active: true, $or: conditions };
  }

  const subscriptions = await PushSubscription.find(query);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || "capflow-alert",
    data: payload.data || { url: "/dashboard" },
    vibrate: payload.vibrate || [150, 75, 150],
    requireInteraction: payload.requireInteraction ?? false,
  });

  let sent = 0;
  let failed = 0;

  const expiredEndpoints: string[] = [];

  for (const subDoc of subscriptions) {
    const pushSubscription = {
      endpoint: subDoc.endpoint,
      keys: {
        p256dh: subDoc.keys.p256dh,
        auth: subDoc.keys.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, notificationPayload, {
        TTL: 86400, // 24 hours
      });
      sent++;
    } catch (err: any) {
      failed++;
      // Check for expired / unregistered subscriptions (HTTP 404 or 410)
      if (err.statusCode === 404 || err.statusCode === 410) {
        expiredEndpoints.push(subDoc.endpoint);
      } else {
        console.warn(`[WebPush] Push failed for endpoint ${subDoc.endpoint.substring(0, 35)}...`, err.message);
      }
    }
  }

  // Deactivate expired subscriptions
  if (expiredEndpoints.length > 0) {
    await PushSubscription.updateMany(
      { endpoint: { $in: expiredEndpoints } },
      { $set: { active: false } }
    );
  }

  return { sent, failed };
}
