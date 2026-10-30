import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import AdminAuditLog from "@/lib/mongodb/adminAuditLogModel";
import SupportTicket from "@/lib/mongodb/supportTicketModel";

export const ADMIN_EMAIL = "capflow@softcapphyjas.com";
export const ADMIN_MASTER_OTP = "100283";
export const ADMIN_COOKIE_NAME = "capflow_admin_token";

export interface AdminPayload {
  email: string;
  role: "admin";
  userId?: string;
  iat?: number;
  exp?: number;
}

// ─── Token Sign & Verify ──────────────────────────────────────────────────────

export function signAdminToken(payload: { email: string; userId?: string }): string {
  const secret = process.env.JWT_SECRET || "capflow-fallback-admin-secret-2026";
  return jwt.sign(
    {
      email: payload.email.toLowerCase(),
      role: "admin",
      userId: payload.userId || "admin-system-id",
    },
    secret,
    { expiresIn: (process.env.JWT_EXPIRY || "90d") as `${number}d` }
  );
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "capflow-fallback-admin-secret-2026";
    const decoded = jwt.verify(token, secret) as AdminPayload;
    if (decoded && decoded.role === "admin") {
      return decoded;
    }
  } catch {
    // Verification failed or expired
  }
  return null;
}

export function getAdminFromRequest(req: NextRequest): AdminPayload | null {
  // 1. Check HTTP-only cookie capflow_admin_token
  const adminCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (adminCookie) {
    const verified = verifyAdminToken(adminCookie);
    if (verified) return verified;
  }

  // 2. Check standard capflow_token cookie for role === 'admin'
  const standardToken = req.cookies.get("capflow_token")?.value;
  if (standardToken) {
    const verified = verifyAdminToken(standardToken);
    if (verified) return verified;
  }

  // 3. Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.substring(7);
    const verified = verifyAdminToken(bearer);
    if (verified) return verified;
  }

  return null;
}

export function requireAdmin(
  req: NextRequest
): { admin: AdminPayload } | { errorResponse: NextResponse } {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      ),
    };
  }
  return { admin };
}

// ─── Rate Limiting for Admin Auth ──────────────────────────────────────────────

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkAdminRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Reset if window has passed
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordFailedAdminAttempt(ip: string): {
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = { attempts: 1, firstAttempt: now };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(ip, record);
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  loginAttempts.set(ip, record);
  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
  };
}

export function resetAdminRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ─── Audit Logger Helper ───────────────────────────────────────────────────────

export async function logAdminAction(params: {
  action:
    | "ADMIN_LOGIN"
    | "ADMIN_LOGOUT"
    | "USER_DELETED"
    | "USER_UPDATED"
    | "EMAIL_DISPATCHED"
    | "TICKET_STATUS_UPDATED"
    | "TICKET_REPLIED"
    | "SYSTEM_CONFIG_UPDATED";
  adminEmail?: string;
  targetType: "User" | "Ticket" | "Email" | "System" | "Auth";
  targetId?: string;
  details?: Record<string, any>;
  req?: NextRequest;
}): Promise<void> {
  try {
    const ipAddress =
      params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      params.req?.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = params.req?.headers.get("user-agent") || "Admin Portal";

    await AdminAuditLog.create({
      action: params.action,
      adminEmail: params.adminEmail || ADMIN_EMAIL,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details || {},
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("[AdminAuditLog] Failed to log action:", err);
  }
}

// ─── Initial Support Tickets & Audit Seeder ───────────────────────────────────

export async function seedInitialAdminDataIfEmpty(): Promise<void> {
  try {
    const ticketCount = await SupportTicket.countDocuments();
    if (ticketCount === 0) {
      await SupportTicket.insertMany([
        {
          ticketId: "TCK-1001",
          userEmail: "rahul.sharma@example.com",
          userName: "Rahul Sharma",
          userPhone: "+91 98201 12345",
          subject: "HDFC Car Loan EMI reminder notification not delivered",
          category: "EMI & Reminders",
          priority: "high",
          status: "open",
          lastRepliedBy: "user",
          messages: [
            {
              sender: "user",
              senderEmail: "rahul.sharma@example.com",
              senderName: "Rahul Sharma",
              message:
                "Hi CapFlow support, my monthly EMI of ₹18,500 was due yesterday but I didn't receive the push reminder or email summary on my phone. Could you check my account settings?",
              createdAt: new Date(Date.now() - 2 * 3600 * 1000),
            },
          ],
        },
        {
          ticketId: "TCK-1002",
          userEmail: "ananya.patel@example.com",
          userName: "Ananya Patel",
          userPhone: "+91 98450 67890",
          subject: "Goa Trip Split session settlement QR code scanning timeout",
          category: "Splitter & Groups",
          priority: "urgent",
          status: "in_progress",
          lastRepliedBy: "admin",
          messages: [
            {
              sender: "user",
              senderEmail: "ananya.patel@example.com",
              senderName: "Ananya Patel",
              message:
                "When I try to scan the UPI QR code generated in our Goa Trip session, the scanner fails to lock focus in low light.",
              createdAt: new Date(Date.now() - 5 * 3600 * 1000),
            },
            {
              sender: "admin",
              senderEmail: ADMIN_EMAIL,
              senderName: "CapFlow Support",
              message:
                "Hello Ananya, we have optimized the contrast matrix in the QR scanner component and enabled manual camera torch assist. Please try refreshing.",
              createdAt: new Date(Date.now() - 3 * 3600 * 1000),
            },
          ],
        },
        {
          ticketId: "TCK-1003",
          userEmail: "vikram.mehta@example.com",
          userName: "Vikram Mehta",
          userPhone: "+91 97110 54321",
          subject: "Requesting export of custom date range financial statement",
          category: "Transactions & Analytics",
          priority: "medium",
          status: "resolved",
          lastRepliedBy: "admin",
          resolvedAt: new Date(Date.now() - 12 * 3600 * 1000),
          messages: [
            {
              sender: "user",
              senderEmail: "vikram.mehta@example.com",
              senderName: "Vikram Mehta",
              message:
                "Is it possible to download an itemized PDF statement for Q2 2026? Thanks!",
              createdAt: new Date(Date.now() - 24 * 3600 * 1000),
            },
            {
              sender: "admin",
              senderEmail: ADMIN_EMAIL,
              senderName: "CapFlow Support",
              message:
                "Hi Vikram, you can now generate custom PDF statements directly from Transactions > Statement Sheet with full category breakdown.",
              createdAt: new Date(Date.now() - 12 * 3600 * 1000),
            },
          ],
        },
      ]);
    }

    const auditCount = await AdminAuditLog.countDocuments();
    if (auditCount === 0) {
      await AdminAuditLog.insertMany([
        {
          action: "ADMIN_LOGIN",
          adminEmail: ADMIN_EMAIL,
          targetType: "Auth",
          details: { method: "Master OTP Bypass (100283)" },
          ipAddress: "127.0.0.1",
          userAgent: "CapFlow System Initialization",
          createdAt: new Date(Date.now() - 24 * 3600 * 1000),
        },
        {
          action: "SYSTEM_CONFIG_UPDATED",
          adminEmail: ADMIN_EMAIL,
          targetType: "System",
          details: { description: "Verified MongoDB Atlas connection & Render Analytics endpoint" },
          ipAddress: "127.0.0.1",
          userAgent: "CapFlow System Initialization",
          createdAt: new Date(Date.now() - 23 * 3600 * 1000),
        },
      ]);
    }
  } catch (err) {
    console.warn("[AdminSeeder] Seeding skipped or error:", err);
  }
}
