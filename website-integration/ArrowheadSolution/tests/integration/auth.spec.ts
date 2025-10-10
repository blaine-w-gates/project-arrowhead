import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../../server/routes';

let server: import('http').Server;

describe('Auth OTP API (Express)', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'testsecret';

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('issues an OTP code and verifies it (happy path)', async () => {
    const email = `test+${Date.now()}@example.com`;

    const reqRes = await request(server)
      .post('/api/auth/request')
      .set('Content-Type', 'application/json')
      .set('x-test-mode', '1')
      .send({ email })
      .expect(200);

    expect(reqRes.body?.success).toBe(true);
    const devCode = String(reqRes.body?.devCode || '');
    expect(devCode).toMatch(/^\d{6}$/);

    const verRes = await request(server)
      .post('/api/auth/verify')
      .set('Content-Type', 'application/json')
      .set('x-test-mode', '1')
      .send({ email, code: devCode })
      .expect(200);

    expect(verRes.body?.success).toBe(true);
    const setCookie = verRes.headers['set-cookie'];
    expect(Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie)).toContain('sb_session=');
  });
});
