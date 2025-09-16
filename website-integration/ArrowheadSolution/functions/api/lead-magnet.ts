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
    // Default to a permissive-but-reasonable superset; OPTIONS handler may override with the requested headers
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With, cf-turnstile-response",
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

// Non-PII hashing helper for diagnostics
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].toString(16).padStart(2, "0");
    out += b;
  }
  return out;
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
  const acrh = request.headers.get("Access-Control-Request-Headers");
  const defaultAllow = (cors as Record<string, string>)["Access-Control-Allow-Headers"] || "Content-Type, Authorization, Accept, X-Requested-With, cf-turnstile-response";
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), "Access-Control-Allow-Headers": acrh || defaultAllow, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Allow": "POST, OPTIONS, HEAD" } });
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

  // PII-safe diagnostic hash (first 10 chars only in logs)
  const emailHash = (await sha256Hex(email)).slice(0, 10);

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
      // Best-effort MailerLite subscribe if enabled (does not affect client response)
      try {
        const mlEnabled = (env.MAILERLITE_ENABLED || "").toLowerCase() === "true";
        if (mlEnabled) {
          const mlBase = (env.MAILERLITE_BASE_URL || "https://connect.mailerlite.com/api").replace(/\/$/, "");
          const mlApiKey = (env.MAILERLITE_API_KEY || "").trim();
          const mlGroupId = (env.MAILERLITE_GROUP_ID || "").trim();
          const mlTimeoutRaw = parseInt(String(env.MAILERLITE_TIMEOUT_MS || 4000), 10);
          const mlTimeout = Number.isFinite(mlTimeoutRaw) ? Math.max(1000, Math.min(mlTimeoutRaw, 15000)) : 4000;

          if (!mlApiKey || !mlGroupId) {
            console.log(JSON.stringify({ evt: "ml_debug", stage: "skip", reason: "missing_config", api_key_present: !!mlApiKey, group_id_present: !!mlGroupId, email_hash: emailHash }));
          } else {
            const mlUrl = `${mlBase}/subscribers`;
            const controller = new AbortController();
            const to = setTimeout(() => controller.abort(), mlTimeout);
            try {
              const body = { email, groups: [mlGroupId] } as Record<string, unknown>;
              const mlRes = await fetch(mlUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${mlApiKey}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
              });
              const text = await mlRes.text().catch(() => "");
              console.log(JSON.stringify({ evt: "ml_debug", stage: "response", status: mlRes.status, ok: mlRes.ok, url: mlUrl, group_id: mlGroupId, body: text.slice(0, 300), email_hash: emailHash }));

              // Optional verification: fetch the created subscriber by id to confirm presence (non-PII)
              try {
                const diagVerify = (env.MAILERLITE_DIAG_VERIFY || "").toLowerCase() === "true";
                if (diagVerify && text) {
                  let id: string | undefined;
                  try {
                    const parsed = JSON.parse(text) as { data?: { id?: string; status?: string } };
                    id = parsed?.data?.id;
                  } catch { /* ignore parse errors */ }
                  if (id) {
                    const verifyUrl = `${mlBase}/subscribers/${encodeURIComponent(id)}`;
                    const vRes = await fetch(verifyUrl, {
                      method: "GET",
                      headers: { Authorization: `Bearer ${mlApiKey}`, Accept: "application/json" },
                      signal: controller.signal,
                    });
                    const vText = await vRes.text().catch(() => "");
                    console.log(JSON.stringify({ evt: "ml_debug", stage: "verify", status: vRes.status, ok: vRes.ok, id_trunc: String(id).slice(0, 12), body: vText.slice(0, 200), email_hash: emailHash }));
                  }
                }
              } catch (verr) {
                console.log(JSON.stringify({ evt: "ml_debug", stage: "verify_error", message: (verr as Error)?.message || String(verr), email_hash: emailHash }));
              }
            } catch (err) {
              const kind = (err as Error)?.name === 'AbortError' ? 'timeout' : 'error';
              console.log(JSON.stringify({ evt: "ml_debug", stage: kind, message: (err as Error)?.message || String(err), email_hash: emailHash }));
            } finally {
              clearTimeout(to);
            }
          }
        } else {
          console.log(JSON.stringify({ evt: "ml_debug", stage: "disabled", email_hash: emailHash }));
        }
      } catch (e) {
        console.log(JSON.stringify({ evt: "ml_debug", stage: "wrapper_catch", message: (e as Error)?.message || String(e), email_hash: emailHash }));
      }

      // Treat conflict (duplicate) as success to avoid leaking existence
      return jsonWithCors(200, { success: true, message: "Thanks! You're on the list." }, cors);
    }

    const text = await res.text();
    return jsonWithCors(502, { success: false, error: "Upstream error", detail: text.slice(0, 200) }, cors);
  } catch {
    return jsonWithCors(500, { success: false, error: "Unexpected error" }, cors);
  }
};
