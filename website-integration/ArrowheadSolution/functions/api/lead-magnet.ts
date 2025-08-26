// Cloudflare Pages Function: Lead Magnet backend
// Path: /api/lead-magnet
// Handles POST with JSON { email } and inserts into Supabase leads table via REST.
// CORS: allows PUBLIC_SITE_URL and localhost dev. Configure ALLOWED_ORIGINS for extras.
// Env required: SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE)
// Optional env: SUPABASE_LEADS_TABLE (default: leads), PUBLIC_SITE_URL, ALLOWED_ORIGINS

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const o = origin ? origin.replace(/\/$/, "") : null;
  if (o && allowed.has(o)) {
    headers["Access-Control-Allow-Origin"] = o;
  }
  return headers;
}

function emailValid(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim();
  if (s.length < 5 || s.length > 320) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(s);
}

function jsonWithCors(status: number, data: unknown, cors: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...(cors as Record<string, string>) },
  });
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  // Respond 204 for preflight regardless; CORS headers still reflect allowed origin if present
  return new Response(null, { status: 204, headers: cors });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  if (!origin || !allowed.has(origin)) {
    // Block disallowed origins
    return jsonWithCors(403, { success: false, error: "Origin not allowed" }, cors);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(400, { success: false, error: "Invalid JSON body" }, cors);
  }

  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = emailRaw.trim().toLowerCase();
  if (!emailValid(email)) {
    return jsonWithCors(400, { success: false, error: "Invalid email" }, cors);
  }

  const supabaseUrl = env.SUPABASE_URL ? env.SUPABASE_URL.replace(/\/$/, "") : "";
  const supabaseKey = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_ANON_KEY || "";
  const table = (env.SUPABASE_LEADS_TABLE || "leads").replace(/[^a-zA-Z0-9_]/g, "");

  if (!supabaseUrl || !supabaseKey) {
    return jsonWithCors(500, { success: false, error: "Server not configured" }, cors);
  }

  const insertUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?on_conflict=email`;
  const payload = [{ email }];

  try {
    const res = await fetch(insertUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 409) {
      // Treat conflict (duplicate) as success to avoid leaking existence
      return jsonWithCors(200, { success: true, message: "Thanks! You're on the list." }, cors);
    }

    const text = await res.text();
    return jsonWithCors(502, { success: false, error: "Upstream error", detail: text.slice(0, 200) }, cors);
  } catch (e: any) {
    return jsonWithCors(500, { success: false, error: "Unexpected error" }, cors);
  }
};
