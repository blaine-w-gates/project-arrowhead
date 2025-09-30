import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createApp } from '../../server/app';
import type { Server } from 'http';

let server: Server;

beforeAll(async () => {
  const { server: httpServer } = await createApp({ withVite: false });
  server = httpServer;
  const port = 5055; // test-only port
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
});

afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Blog API', () => {
  const base = 'http://127.0.0.1:5055';

  it('GET /api/blog/posts returns published posts', async () => {
    const res = await request(base).get('/api/blog/posts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('HEAD /api/blog/posts returns 204 when healthy', async () => {
    const res = await request(base).head('/api/blog/posts');
    expect([204, 200]).toContain(res.status);
  });
});
