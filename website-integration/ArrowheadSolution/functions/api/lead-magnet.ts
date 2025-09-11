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

// Flexible preview-aware origin check for Pages preview deployments
function isAllowedOriginFlexible(origin: string | null): boolean {
  if (!origin) return false;
  const o = origin.replace(/\/$/, "");
  return (
    o.endsWith('.project-arrowhead.pages.dev') ||
    o === 'https://project-arrowhead.pages.dev' ||
    o === 'http://localhost:5173'
  );
}

function buildCorsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const o = origin ? origin.replace(/\/$/, "") : null;
  // Allow either explicitly configured origins OR preview/main/local origins per flexible policy
  if (o && (allowed.has(o) || isAllowedOriginFlexible(o))) {
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
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", ...(cors as Record<string, string>) },
  });
}

// --- Debug helpers (temporary for CORS ground-truth) ---
function redactHeaders(h: Headers): Record<string, string> {
  const redacted = Object.create(null) as Record<string, string>;
  const SENSITIVE = new Set(["authorization", "cookie", "cf-access-client-secret"]);
  for (const [k, v] of h.entries()) {
    redacted[k.toLowerCase()] = SENSITIVE.has(k.toLowerCase()) ? "***" : v;
  }
  return redacted;
}
function logCorsDebug(kind: string, req: Request, origin: string | null, allowed: Set<string>, cors: HeadersInit) {
  try {
    const oRaw = req.headers.get("Origin");
    const oNorm = origin;
    const oTrim = oNorm ? oNorm.replace(/\/$/, "") : null;
    const acao = (cors as Record<string, string>)["Access-Control-Allow-Origin"] || undefined;
    const allowedHas = oTrim ? allowed.has(oTrim) : false;
    const flex = isAllowedOriginFlexible(oTrim);
    // Structured one-line JSON for easy log scraping
    console.log(JSON.stringify({
      evt: "cors_debug",
      kind,
      origin_raw: oRaw,
      origin_norm: oNorm,
      allowed_has: allowedHas,
      flexible: flex,
      acao,
      headers: redactHeaders(req.headers),
    }));
  } catch { /* ignore logging errors */ }
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  logCorsDebug("OPTIONS", request, origin, allowed, cors);
  // Respond 204 for preflight regardless; CORS headers still reflect allowed origin if present
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Allow": "POST, OPTIONS, HEAD" } });
};

// Lightweight health/CORS check
export const onRequestHead = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  logCorsDebug("HEAD", request, origin, allowed, cors);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Allow": "POST, OPTIONS, HEAD" } });
};

// Disallow GET to prevent caching or accidental exposure; advertise allowed methods
export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  logCorsDebug("GET", request, origin, allowed, cors);
  return new Response(null, { status: 405, headers: { ...(cors as Record<string, string>), "Allow": "POST, OPTIONS, HEAD", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  logCorsDebug("POST", request, origin, allowed, cors);

  if (!origin || !(allowed.has(origin) || isAllowedOriginFlexible(origin))) {
    // Block disallowed origins
    const originRaw = request.headers.get("Origin");
    return jsonWithCors(403, { success: false, error: "Origin not allowed", received_origin: originRaw, normalized_origin: origin }, cors);
  }

  // Enforce JSON Content-Type and small payloads
  const ct = request.headers.get("Content-Type") || "";
  if (!/application\/json/i.test(ct)) {
    return jsonWithCors(415, { success: false, error: "Content-Type must be application/json" }, cors);
  }
  const maxBytes = 2048; // 2KB max JSON body
  const lenHeader = request.headers.get("Content-Length");
  if (lenHeader) {
    const n = parseInt(lenHeader, 10);
    if (!Number.isNaN(n) && n > maxBytes) {
      return jsonWithCors(413, { success: false, error: "Payload too large" }, cors);
    }
  }

  let obj: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > maxBytes) {
      return jsonWithCors(413, { success: false, error: "Payload too large" }, cors);
    }
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
      return jsonWithCors(400, { success: false, error: "Invalid JSON body" }, cors);
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return jsonWithCors(400, { success: false, error: "Invalid JSON body" }, cors);
  }

  const emailRaw = typeof obj.email === "string" ? (obj.email as string) : "";
  const email = emailRaw.trim().toLowerCase();
  if (!emailValid(email)) {
    return jsonWithCors(400, { success: false, error: "Invalid email" }, cors);
  }

  // Optional Cloudflare Turnstile verification
  try {
    const turnstileSecret = env.TURNSTILE_SECRET_KEY || "";
    const requireTurnstile = (env.TURNSTILE_REQUIRED || "").toLowerCase() === "true";
    if (turnstileSecret && requireTurnstile) {
      const token =
        typeof obj["turnstileToken"] === "string"
          ? (obj["turnstileToken"] as string).trim()
          : (typeof obj["cf-turnstile-response"] === "string" ? (obj["cf-turnstile-response"] as string).trim() : "");
      if (!token) {
        return jsonWithCors(400, { success: false, error: "Captcha required" }, cors);
      }
      const remoteip = request.headers.get("CF-Connecting-IP") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const bodyParams = new URLSearchParams({ secret: turnstileSecret, response: token });
      if (remoteip) bodyParams.set("remoteip", remoteip);
      const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams.toString(),
      });
      const tsJson = (await tsRes.json().catch(() => ({ success: false }))) as { success?: boolean };
      if (!tsJson?.success) {
        return jsonWithCors(400, { success: false, error: "Captcha verification failed" }, cors);
      }
    }
  } catch {
    // Fail closed if Turnstile is required but verification errors
    if ((env.TURNSTILE_REQUIRED || "").toLowerCase() === "true") {
      return jsonWithCors(400, { success: false, error: "Captcha verification failed" }, cors);
    }
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
  } catch {
    return jsonWithCors(500, { success: false, error: "Unexpected error" }, cors);
  }
};
