// Cloudflare Pages Function: Auth - Request OTP
// Path: /api/auth/request

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

function jsonWithCors(status: number, data: unknown, cors: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(cors as Record<string, string>) },
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
  const email = emailRaw.trim().toLowerCase();
  if (!emailValid(email)) {
    return jsonWithCors(400, { success: false, error: "Invalid email" }, cors);
  }

  const supabaseUrl = env.SUPABASE_URL ? env.SUPABASE_URL.replace(/\/$/, "") : "";
  const supabaseKey = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return jsonWithCors(500, { success: false, error: "Server not configured" }, cors);
  }

  // Rate-limit via DB: count requests in last minute
  try {
    const since = new Date(Date.now() - 60_000).toISOString();
    const countUrl = `${supabaseUrl}/rest/v1/auth_otp?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(since)}`;
    const cRes = await fetch(countUrl, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
    if (!cRes.ok) throw new Error(`count ${cRes.status}`);
    const entries = await cRes.json() as unknown[];
    if (entries.length >= 5) {
      return jsonWithCors(429, { success: false, error: "Too many requests" }, cors);
    }
  } catch {
    // best-effort; continue on errors
  }

  // Generate OTP and insert
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await sha256HexWeb(code);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const ip = request.headers.get("CF-Connecting-IP") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const userAgent = request.headers.get("user-agent") || "";

  try {
    const insertUrl = `${supabaseUrl}/rest/v1/auth_otp`;
    const payload = [{ email, code_hash: codeHash, purpose: "login", attempts: 0, max_attempts: 5, expires_at: expiresAt, created_at: new Date().toISOString(), ip, user_agent: userAgent }];
    const iRes = await fetch(insertUrl, {
      method: "POST",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    if (!iRes.ok) throw new Error(`insert ${iRes.status}`);

    const evUrl = `${supabaseUrl}/rest/v1/auth_events`;
    const ev = [{ user_id: null, type: "otp_issued", metadata: JSON.stringify({ email, ip }), created_at: new Date().toISOString() }];
    await fetch(evUrl, { method: "POST", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(ev) });

    // Note: In production, integrate mail provider. For now, do not include code in response.
    return jsonWithCors(200, { success: true }, cors);
  } catch (e) {
    return jsonWithCors(500, { success: false, error: "Unexpected error" }, cors);
  }
};
