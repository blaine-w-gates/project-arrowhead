// Cloudflare Pages Function: Auth - Verify OTP
// Path: /api/auth/verify

function normalizeOrigin(o: string | null): string | null {
  if (!o) return null;
  try {
    const u = new URL(o);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(env: Record<string, string>): Set<string> {
  const set = new Set<string>();
  const site = env.PUBLIC_SITE_URL ? env.PUBLIC_SITE_URL.replace(/\/$/, "") : "";
  if (site) set.add(site);
  if (env.ALLOWED_ORIGINS) {
    env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean).forEach((o) => set.add(o.replace(/\/$/, "")));
  }
  // Dev defaults
  set.add("http://localhost:5173");
  set.add("http://127.0.0.1:5173");
  return set;
}

function buildCorsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const o = origin ? origin.replace(/\/$/, "") : null;
  if (o && (allowed.has(o) || o.endsWith('.project-arrowhead.pages.dev') || o === 'https://project-arrowhead.pages.dev')) {
    headers["Access-Control-Allow-Origin"] = o;
  }
  return headers;
}

function jsonWithCors(status: number, data: unknown, cors: HeadersInit, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cors as Record<string, string>), ...(extraHeaders as Record<string, string> || {}) },
  });
}

function emailValid(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim();
  if (s.length < 5 || s.length > 320) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(s);
}

async function sha256HexWeb(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function signJwtWeb(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload } as Record<string, unknown>;
  const enc = new TextEncoder();
  const headerPart = btoa(String.fromCharCode(...enc.encode(JSON.stringify(header)))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payloadPart = btoa(String.fromCharCode(...enc.encode(JSON.stringify(body)))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const data = `${headerPart}.${payloadPart}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  const sigB64 = btoa(String.fromCharCode(...sig)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sigB64}`;
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), "Allow": "POST, OPTIONS, HEAD" } });
};

export const onRequestHead = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), "Allow": "POST, OPTIONS, HEAD" } });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  if (!origin || !(allowed.has(origin) || origin.endsWith('.project-arrowhead.pages.dev') || origin === 'https://project-arrowhead.pages.dev')) {
    return jsonWithCors(403, { success: false, error: "Origin not allowed" }, cors);
  }

  const ct = request.headers.get("Content-Type") || "";
  if (!/application\/json/i.test(ct)) {
    return jsonWithCors(415, { success: false, error: "Content-Type must be application/json" }, cors);
  }

  let obj: Record<string, unknown>;
  try {
    obj = await request.json() as Record<string, unknown>;
  } catch {
    return jsonWithCors(400, { success: false, error: "Invalid JSON body" }, cors);
  }

  const emailRaw = typeof obj.email === "string" ? (obj.email as string) : "";
  const codeRaw = typeof obj.code === "string" ? (obj.code as string) : "";
  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();
  if (!emailValid(email) || !/^\d{6,8}$/.test(code)) {
    return jsonWithCors(400, { success: false, error: "Invalid email or code" }, cors);
  }

  const supabaseUrl = env.SUPABASE_URL ? env.SUPABASE_URL.replace(/\/$/, "") : "";
  const supabaseKey = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return jsonWithCors(500, { success: false, error: "Server not configured" }, cors);
  }

  try {
    // Get recent OTPs for email, newest first, limit 5
    const listUrl = `${supabaseUrl}/rest/v1/auth_otp?select=*&email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=5`;
    const lRes = await fetch(listUrl, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
    if (!lRes.ok) throw new Error(`list ${lRes.status}`);
    const entries = await lRes.json() as Array<{ id: number; code_hash?: string | null; attempts?: number; max_attempts?: number; expires_at?: string | null }>;

    const now = Date.now();
    const candidate = entries.find(e => {
      const exp = e.expires_at ? Date.parse(e.expires_at) : 0;
      const attempts = e.attempts ?? 0;
      const maxAttempts = e.max_attempts ?? 5;
      return exp >= now && attempts < maxAttempts;
    });
    if (!candidate) {
      const evUrl = `${supabaseUrl}/rest/v1/auth_events`;
      const ev = [{ user_id: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "no_valid_otp" }), created_at: new Date().toISOString() }];
      await fetch(evUrl, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(ev) });
      return jsonWithCors(401, { success: false, error: "Invalid or expired code" }, cors);
    }

    const ok = candidate.code_hash && candidate.code_hash === await sha256HexWeb(code);
    if (!ok) {
      // increment attempts best-effort
      try {
        const upUrl = `${supabaseUrl}/rest/v1/auth_otp?id=eq.${candidate.id}`;
        await fetch(upUrl, { method: 'PATCH', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ attempts: (candidate.attempts ?? 0) + 1 }) });
      } catch (_e) { /* noop */ }
      const evUrl = `${supabaseUrl}/rest/v1/auth_events`;
      const ev = [{ user_id: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "mismatch" }), created_at: new Date().toISOString() }];
      await fetch(evUrl, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(ev) });
      return jsonWithCors(401, { success: false, error: "Invalid or expired code" }, cors);
    }

    // Resolve or create user via REST
    let userId: number | null = null;
    const selUserUrl = `${supabaseUrl}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}&limit=1`;
    const sRes = await fetch(selUserUrl, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
    if (!sRes.ok) throw new Error(`users get ${sRes.status}`);
    const usersArr = await sRes.json() as Array<{ id: number }>;
    if (usersArr.length > 0) {
      userId = usersArr[0].id;
    } else {
      const insUserUrl = `${supabaseUrl}/rest/v1/users`;
      const uRes = await fetch(insUserUrl, { method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" }, body: JSON.stringify([{ email, password: crypto.randomUUID(), tier: 'free' }]) });
      if (!uRes.ok) throw new Error(`users insert ${uRes.status}`);
      const uRows = await uRes.json().catch(() => []) as Array<{ id: number }>;
      userId = (uRows && uRows[0]?.id) || null;
    }

    const secret = env.AUTH_JWT_SECRET || '';
    if (!secret) {
      return jsonWithCors(500, { success: false, error: "Server not configured" }, cors);
    }
    const jti = crypto.randomUUID().replace(/-/g,'');
    const token = await signJwtWeb({ sub: String(userId), jti }, secret, 7 * 24 * 60 * 60);

    const cookie = [`sb_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=604800', 'Secure'].join('; ');

    const evUrl = `${supabaseUrl}/rest/v1/auth_events`;
    const ev = [{ user_id: userId, type: "login", metadata: JSON.stringify({ jti }), created_at: new Date().toISOString() }];
    await fetch(evUrl, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(ev) });

    return jsonWithCors(200, { success: true, user: { id: userId, email } }, cors, { 'Set-Cookie': cookie });
  } catch (e) {
    return jsonWithCors(500, { success: false, error: "Unexpected error" }, cors);
  }
};
