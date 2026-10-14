/**
 * @jest-environment node
 *
 * Use the Node environment — Next.js route handlers import `Request`
 * from the Web API. Node 18+ provides it natively; jsdom conflicts.
 *
 * __tests__/integration/api/auth.test.ts
 *
 * Integration tests for auth API routes.
 *
 * Strategy: We mock the external dependencies (MongoDB, Nodemailer, JWT)
 * and test the route handler logic directly using Next.js's NextRequest.
 * This lets us verify the request/response contract without a live database.
 */

import { NextRequest } from 'next/server';
import { POST as requestOTP } from '@/app/api/auth/otp/request/route';
import { GET  as getMe     } from '@/app/api/me/route';

// ── Module mocks ───────────────────────────────────────────────────────────────

// Mock MongoDB connection — always resolves without touching Atlas
jest.mock('@/lib/mongodb/connection', () => ({
  connectMongoDB: jest.fn().mockResolvedValue(undefined),
}));

// Mock nodemailer-based OTP mailer — pretend email is always sent
jest.mock('@/lib/email/mailer', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ accepted: ['test@example.com'] }),
}));

// Mock the User mongoose model
jest.mock('@/lib/mongodb/userModel', () => {
  const mockUser = {
    _id: 'mongo-user-id-123',
    email: 'test@example.com',
    name: 'testuser',
    avatar: undefined,
    preferences: {
      emailNotifications: {
        emiReminders: false,
        monthlyStatement: false,
        emiEmailSync: false,
      },
    },
  };
  return {
    __esModule: true,
    default: {
      findOneAndUpdate: jest.fn().mockResolvedValue(mockUser),
      findById: jest.fn(() => ({
        select: jest.fn().mockResolvedValue(mockUser),
      })),
    },
  };
});

// Mock jsonwebtoken — predictable decoded payload
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ userId: 'mongo-user-id-123', email: 'test@example.com' }),
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

// Ensure JWT_SECRET is set for the route handlers
process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.NODE_ENV   = 'test';

// ── Helper: build a NextRequest ────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: object; cookies?: Record<string, string> } = {}
): NextRequest {
  const reqOptions: RequestInit = {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  const req = new NextRequest(new URL(url, 'http://localhost:3000'), reqOptions);

  // Attach cookies if provided
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      // @ts-expect-error — internal cookie map patching for test purposes
      req.cookies.set(name, value);
    });
  }

  return req;
}

// ── POST /api/auth/otp/request ─────────────────────────────────────────────────

describe('POST /api/auth/otp/request', () => {
  it('returns 200 and success:true for a valid email', async () => {
    const req = makeRequest('/api/auth/otp/request', {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    const res = await requestOTP(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 400 for a missing email', async () => {
    const req = makeRequest('/api/auth/otp/request', {
      method: 'POST',
      body: {},
    });
    const res = await requestOTP(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
  });

  it('returns 400 for an invalid email (no @ symbol)', async () => {
    const req = makeRequest('/api/auth/otp/request', {
      method: 'POST',
      body: { email: 'notanemail' },
    });
    const res = await requestOTP(req);
    expect(res.status).toBe(400);
  });

  it('exposes devOtp in non-production environment', async () => {
    const req = makeRequest('/api/auth/otp/request', {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    const res = await requestOTP(req);
    const json = await res.json();

    // NODE_ENV is 'test' (not 'production') so devOtp should be present
    expect(json.devOtp).toBeDefined();
    expect(json.devOtp).toMatch(/^\d{6}$/);
  });
});

// ── GET /api/me ────────────────────────────────────────────────────────────────

describe('GET /api/me', () => {
  it('returns 401 when no auth cookie is present', async () => {
    const req = makeRequest('/api/me', { method: 'GET' });
    const res = await getMe(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('authenticated');
  });

  it('returns 200 with user data when a valid JWT cookie is present', async () => {
    const req = makeRequest('/api/me', {
      method: 'GET',
      cookies: { capflow_token: 'mock-jwt-token' },
    });
    const res = await getMe(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe('test@example.com');
    expect(json.user.id).toBe('mongo-user-id-123');
  });
});
