import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { webcrypto as nodeCrypto } from 'node:crypto';

// Import the Cloudflare Pages Function handlers
// NOTE: path goes up from client/src/__tests__ to functions/api
import { onRequestPost } from '../../../functions/api/lead-magnet';

function makeEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    PUBLIC_SITE_URL: 'https://project-arrowhead.pages.dev',
    SUPABASE_URL: 'https://supabase.example.com',
    SUPABASE_SERVICE_ROLE: 'service-role-key',
    MAILERLITE_BASE_URL: 'https://connect.mailerlite.com/api',
    SUPABASE_LEADS_TABLE: 'leads',
    ...overrides,
  };
}

function makeRequest(email: string): Request {
  return new Request('https://project-arrowhead.pages.dev/api/lead-magnet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://project-arrowhead.pages.dev',
    },
    body: JSON.stringify({ email }),
  });
}

describe('Lead Magnet MailerLite integration (function-level)', () => {
  const SUPABASE_INSERT = 'https://supabase.example.com/rest/v1/leads?on_conflict=email';
  const ML_POST = 'https://connect.mailerlite.com/api/subscribers';

  // Ensure web crypto exists for sha256 used in the function
  beforeAll(() => {
    type CryptoLike = { subtle?: unknown };
    const g = globalThis as unknown as { crypto?: CryptoLike };
    if (!g.crypto || !g.crypto.subtle) {
      Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto, configurable: true });
    }
  });

  let originalFetch: typeof fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true });
  });

  afterEach(() => {
    // restore original fetch
    Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true });
    vi.restoreAllMocks();
  });

  it('returns 200 when ML is disabled (no ML call)', async () => {
    const env = makeEnv({ MAILERLITE_ENABLED: 'false' });

    const calls: string[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      calls.push(url);
      if (url === SUPABASE_INSERT) {
        return new Response(null, { status: 201 });
      }
      throw new Error('Unexpected fetch: ' + url);
    });

    const res = await onRequestPost({ request: makeRequest('user+disabled@test.com'), env });
    expect(res.status).toBe(200);
    expect(calls).toEqual([SUPABASE_INSERT]);
  });

  it('calls MailerLite and returns 200 on 201 response', async () => {
    const env = makeEnv({ MAILERLITE_ENABLED: 'true', MAILERLITE_API_KEY: 'k', MAILERLITE_GROUP_ID: 'g' });

    const calls: string[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      calls.push(url);
      if (url === SUPABASE_INSERT) {
        return new Response(null, { status: 201 });
      }
      if (url === ML_POST) {
        return new Response(JSON.stringify({ data: { id: 'abc123' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error('Unexpected fetch: ' + url);
    });

    const res = await onRequestPost({ request: makeRequest('user+ok@test.com'), env });
    expect(res.status).toBe(200);
    expect(calls).toEqual([SUPABASE_INSERT, ML_POST]);
  });

  it('optionally performs verify when MAILERLITE_DIAG_VERIFY=true', async () => {
    const env = makeEnv({ MAILERLITE_ENABLED: 'true', MAILERLITE_API_KEY: 'k', MAILERLITE_GROUP_ID: 'g', MAILERLITE_DIAG_VERIFY: 'true' });

    const ML_VERIFY = 'https://connect.mailerlite.com/api/subscribers/abc123';
    const calls: string[] = [];
    fetchMock.mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      calls.push(url);
      if (url === SUPABASE_INSERT) {
        return new Response(null, { status: 201 });
      }
      if (url === ML_POST) {
        return new Response(JSON.stringify({ data: { id: 'abc123' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === ML_VERIFY) {
        return new Response(JSON.stringify({ data: { id: 'abc123', status: 'active' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error('Unexpected fetch: ' + url);
    });

    const res = await onRequestPost({ request: makeRequest('user+verify@test.com'), env });
    expect(res.status).toBe(200);
    // MailerLite POST must occur; verify may occur depending on runtime behavior
    expect(calls[0]).toBe(SUPABASE_INSERT);
    expect(calls[1]).toBe(ML_POST);
    if (calls.length > 2) {
      expect(calls[2]).toBe(ML_VERIFY);
    }
  });

  it('continues gracefully when ML returns 401', async () => {
    const env = makeEnv({ MAILERLITE_ENABLED: 'true', MAILERLITE_API_KEY: 'bad', MAILERLITE_GROUP_ID: 'g' });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (url === SUPABASE_INSERT) return new Response(null, { status: 201 });
      if (url === ML_POST) return new Response('Unauthorized', { status: 401 });
      throw new Error('Unexpected fetch: ' + url);
    });

    const res = await onRequestPost({ request: makeRequest('user+401@test.com'), env });
    expect(res.status).toBe(200);
  });

  it('continues gracefully when ML throws AbortError (timeout)', async () => {
    const env = makeEnv({ MAILERLITE_ENABLED: 'true', MAILERLITE_API_KEY: 'k', MAILERLITE_GROUP_ID: 'g', MAILERLITE_TIMEOUT_MS: '10' });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      if (url === SUPABASE_INSERT) return new Response(null, { status: 201 });
      if (url === ML_POST) {
        const err = new Error('aborted');
        Object.defineProperty(err, 'name', { value: 'AbortError' });
        throw err;
      }
      throw new Error('Unexpected fetch: ' + url);
    });

    const res = await onRequestPost({ request: makeRequest('user+timeout@test.com'), env });
    expect(res.status).toBe(200);
  });
});
