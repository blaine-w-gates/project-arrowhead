import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authOtp, authEvents, users } from '@shared/schema';

// Mock the DB layer used by server/routes.ts so tests run without a real database
vi.mock('../../server/db', () => {
  type OtpRow = {
    id: number;
    email: string;
    codeHash: string | null;
    purpose: string | null;
    attempts: number;
    maxAttempts: number;
    expiresAt: Date | null;
    createdAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  };
  const store = {
    otps: [] as OtpRow[],
    events: [] as Array<{ id: number; userId: number | null; type: string; metadata: string | null; createdAt: Date }>,
    users: [] as Array<{ id: number; email: string; password: string; tier: string }>,
  };
  let otpId = 1;
  let eventId = 1;
  let userId = 1;

  function getDb() {
    return {
      insert: (table: unknown) => ({
        values: async (vals: any) => {
          // auth_otp
          if (table === authOtp) {
            const row: OtpRow = {
              id: otpId++,
              email: String(vals.email),
              codeHash: vals.codeHash ?? vals.code_hash ?? null,
              purpose: vals.purpose ?? null,
              attempts: vals.attempts ?? 0,
              maxAttempts: vals.maxAttempts ?? vals.max_attempts ?? 5,
              expiresAt: vals.expiresAt ?? (vals.expires_at ? new Date(vals.expires_at) : null),
              createdAt: vals.createdAt ?? new Date(),
              ip: vals.ip ?? null,
              userAgent: vals.userAgent ?? vals.user_agent ?? null,
            };
            store.otps.push(row);
            return { returning: async () => [row] };
          }
          // auth_events
          if (table === authEvents) {
            const row = {
              id: eventId++,
              userId: vals.userId ?? null,
              type: String(vals.type),
              metadata: typeof vals.metadata === 'string' ? vals.metadata : (vals.metadata ? JSON.stringify(vals.metadata) : null),
              createdAt: vals.createdAt ?? new Date(),
            };
            store.events.push(row);
            return { returning: async () => [row] };
          }
          // users
          if (table === users) {
            const row = {
              id: userId++,
              email: String(vals.email),
              password: String(vals.password ?? ''),
              tier: String(vals.tier ?? 'free'),
            };
            store.users.push(row);
            return { returning: async () => [row] };
          }
          return { returning: async () => [] };
        },
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: (_cond: unknown) => ({
            orderBy: (_o: unknown) => ({
              limit: async (_n: number) => {
                if (table === authOtp) {
                  // return latest OTPs (no extra filtering; tests isolate per email)
                  const sorted = [...store.otps].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                  return sorted.slice(0, _n);
                }
                return [];
              },
            }),
            then: (cb: (rows: any[]) => any) => {
              if (table === users) {
                // Always return empty; route will create user
                return Promise.resolve(cb([]));
              }
              return Promise.resolve(cb([]));
            },
          }),
        }),
      }),
      update: (table: unknown) => ({
        set: (vals: any) => ({
          where: async (_whereCond: unknown) => {
            if (table === authOtp && typeof vals?.attempts === 'number') {
              // Increment the most recent OTP's attempts as a best-effort simulation
              const last = [...store.otps].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
              if (last) last.attempts = vals.attempts;
            }
          },
        }),
      }),
    };
  }

  return { getDb };
});

import { registerRoutes } from '../../server/routes';

let server: import('http').Server;
let logSpy: ReturnType<typeof vi.spyOn>;

describe('Auth OTP API (Express, integration)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'testsecret';

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('issues an OTP code and verifies it (happy path)', async () => {
    const email = `test+${Date.now()}@example.com`;

    // Request OTP
    const reqRes = await request(server)
      .post('/api/auth/request')
      .set('Content-Type', 'application/json')
      .send({ email })
      .expect(200);

    expect(reqRes.body?.success).toBe(true);

    // Extract code from dev log
    const msg = (logSpy.mock.calls.find((c) => String(c[0]).includes(`[auth][dev] OTP for ${email}:`)) || [""])[0] as string;
    const code = (msg.match(/(\d{6,8})/) || [""])[0];
    expect(code).toMatch(/^\d{6}$/);

    // Verify OTP
    const verRes = await request(server)
      .post('/api/auth/verify')
      .set('Content-Type', 'application/json')
      .send({ email, code })
      .expect(200);

    expect(verRes.body?.success).toBe(true);
    const setCookie = verRes.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie || '');
    expect(cookieStr).toContain('sb_session=');
  });
});
