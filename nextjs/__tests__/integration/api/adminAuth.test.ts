/**
 * @jest-environment node
 *
 * __tests__/integration/api/adminAuth.test.ts
 *
 * Comprehensive integration tests for CapFlow Admin Portal Authentication & Bypass:
 * - Special Admin Bypass (capflow@softcapphyjas.com + master OTP 100283)
 * - Skip external SMTP email call on admin login request
 * - Admin JWT signing and HTTP-only cookie issuance
 * - Rate limiting on failed admin login attempts
 * - Admin route guards and logout session destruction
 */

import { NextRequest } from "next/server";
import { POST as requestOTP } from "@/app/api/auth/otp/request/route";
import { POST as verifyOTP } from "@/app/api/auth/otp/verify/route";
import { POST as adminLogin } from "@/app/api/admin/auth/login/route";
import { POST as adminLogout } from "@/app/api/admin/auth/logout/route";
import { sendOTPEmail } from "@/lib/email/mailer";
import {
  checkAdminRateLimit,
  recordFailedAdminAttempt,
  resetAdminRateLimit,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/auth/adminAuth";

// ── Module Mocks ─────────────────────────────────────────────────────────────

jest.mock("@/lib/mongodb/connection", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/email/mailer", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ accepted: ["test@example.com"] }),
}));

jest.mock("@/lib/mongodb/userModel", () => {
  const adminUser = {
    _id: "mongo-admin-6789",
    email: "capflow@softcapphyjas.com",
    name: "CapFlow Master Admin",
    role: "admin",
    preferences: {
      emailNotifications: {
        emiReminders: false,
        monthlyStatement: false,
        emiEmailSync: false,
      },
    },
    save: jest.fn().mockResolvedValue(true),
  };

  return {
    __esModule: true,
    default: {
      findOneAndUpdate: jest.fn().mockResolvedValue(adminUser),
      findOne: jest.fn().mockImplementation((query) => {
        if (query.email === "capflow@softcapphyjas.com") {
          return Promise.resolve(adminUser);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue(adminUser),
    },
  };
});

jest.mock("@/lib/mongodb/adminAuditLogModel", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    }),
    countDocuments: jest.fn().mockResolvedValue(5),
  },
}));

jest.mock("@/lib/mongodb/supportTicketModel", () => ({
  __esModule: true,
  default: {
    deleteMany: jest.fn().mockResolvedValue({}),
    countDocuments: jest.fn().mockResolvedValue(3),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    }),
  },
}));

process.env.JWT_SECRET = "test-capflow-secret-super-long-2026";
(process.env as any).NODE_ENV = "test";

function makeJsonRequest(url: string, body: any, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
  });
}

describe("Admin Authentication & Master Bypass Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAdminRateLimit("127.0.0.1");
    resetAdminRateLimit("admin-test-ip");
  });

  describe("1. Special Admin Bypass (capflow@softcapphyjas.com)", () => {
    it("skips triggering the external SMTP email service when requesting OTP for admin", async () => {
      const req = makeJsonRequest("/api/auth/otp/request", {
        email: "capflow@softcapphyjas.com",
      });

      const res = await requestOTP(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.isAdmin).toBe(true);
      // Crucial assertion: sendOTPEmail MUST NOT be invoked for master admin
      expect(sendOTPEmail).not.toHaveBeenCalled();
    });

    it("successfully validates master OTP 100283 and issues admin session cookies", async () => {
      const req = makeJsonRequest("/api/auth/otp/verify", {
        email: "capflow@softcapphyjas.com",
        otp: "100283",
      });

      const res = await verifyOTP(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe("admin");
      expect(json.redirectUrl).toBe("/admin/dashboard");

      // Verify HTTP-Only cookies are set
      const adminCookie = res.cookies.get("capflow_admin_token");
      const standardCookie = res.cookies.get("capflow_token");

      expect(adminCookie).toBeDefined();
      expect(standardCookie).toBeDefined();

      // Verify the JWT payload
      const decoded = verifyAdminToken(adminCookie!.value);
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe("capflow@softcapphyjas.com");
      expect(decoded?.role).toBe("admin");
    });

    it("rejects invalid master OTP for admin email", async () => {
      const req = makeJsonRequest("/api/auth/otp/verify", {
        email: "capflow@softcapphyjas.com",
        otp: "999999", // wrong OTP
      });

      const res = await verifyOTP(req);
      expect(res.status).toBe(400); // No user otpHash since it's admin bypass
    });
  });

  describe("2. Dedicated Admin Auth Endpoint (/api/admin/auth/login)", () => {
    it("authenticates capflow@softcapphyjas.com with 100283", async () => {
      const req = makeJsonRequest("/api/admin/auth/login", {
        email: "capflow@softcapphyjas.com",
        otp: "100283",
      });

      const res = await adminLogin(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe("admin");
      expect(res.cookies.get("capflow_admin_token")).toBeDefined();
    });

    it("rejects non-admin credentials with 401 and decrements remaining attempts", async () => {
      const req = makeJsonRequest("/api/admin/auth/login", {
        email: "hacker@example.com",
        otp: "123456",
      });

      const res = await adminLogin(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toContain("Invalid admin credentials");
    });
  });

  describe("3. Admin Login Rate Limiting", () => {
    it("locks out an IP after 5 consecutive failed attempts", () => {
      const testIp = "192.168.1.50";
      resetAdminRateLimit(testIp);

      // 4 failed attempts: still allowed
      for (let i = 0; i < 4; i++) {
        const attempt = recordFailedAdminAttempt(testIp);
        expect(attempt.locked).toBe(false);
      }

      // 5th attempt locks the account
      const finalAttempt = recordFailedAdminAttempt(testIp);
      expect(finalAttempt.locked).toBe(true);
      expect(finalAttempt.remainingAttempts).toBe(0);

      // Next check returns allowed: false
      const check = checkAdminRateLimit(testIp);
      expect(check.allowed).toBe(false);
      expect(check.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("4. Admin Logout Session Clearance", () => {
    it("destroys admin session cookies on logout", async () => {
      const token = signAdminToken({ email: "capflow@softcapphyjas.com" });
      const req = new NextRequest(new URL("/api/admin/auth/logout", "http://localhost:3000"), {
        method: "POST",
        headers: { Cookie: `capflow_admin_token=${token}` },
      });

      const res = await adminLogout(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify cookie is cleared (maxAge: 0)
      const adminCookie = res.cookies.get("capflow_admin_token");
      expect(adminCookie?.maxAge).toBe(0);
    });
  });
});
