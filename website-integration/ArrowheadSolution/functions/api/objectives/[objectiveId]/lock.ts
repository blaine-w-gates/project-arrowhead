import { createClient } from '@supabase/supabase-js';

type LockRecord = {
  userId: string;
  teamMemberId: string;
  expiresAt: number; // epoch ms
};

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const locks: Map<string, LockRecord> = new Map();

function normalizeOrigin(o: string | null): string | null {
  if (!o) return null;
  try {
    const u = new URL(o);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(env: { [key: string]: string | undefined }): Set<string> {
  const set = new Set<string>();
  const site = env.PUBLIC_SITE_URL ? env.PUBLIC_SITE_URL.replace(/\/$/, "") : "";
  if (site) set.add(site);
  const allowedOrigins = env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    allowedOrigins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((o) => set.add(o.replace(/\/$/, "")));
  }
  set.add("http://localhost:5173");
  set.add("http://127.0.0.1:5173");
  set.add("http://localhost:5000");
  return set;
}

function buildCorsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS, HEAD",
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
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cors as Record<string, string>),
      ...((extraHeaders as Record<string, string>) || {}),
    },
  });
}

async function verifyJwtWeb(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts;
    const data = `${headerPart}.${payloadPart}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(atob(signaturePart.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
    if (!valid) return null;
    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function cleanupExpired() {
  const now = Date.now();
  for (const [objectiveId, rec] of locks) {
    if (rec.expiresAt <= now) locks.delete(objectiveId);
  }
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), Allow: 'POST, DELETE, OPTIONS, HEAD' } });
};

export const onRequestPost = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Missing or invalid Authorization header" }, cors);
    }
    const token = authHeader.substring(7);
    const jwtSecret = env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Invalid or expired token" }, cors);
    }
    const userId = (payload.sub as string) || '';

    const objectiveId = params?.objectiveId as string;
    if (!objectiveId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing objectiveId" }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: obj, error: objErr } = await supabase
      .from('objectives')
      .select('id, project_id')
      .eq('id', objectiveId)
      .maybeSingle();
    if (objErr) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify objective" }, cors);
    }
    if (!obj) {
      return jsonWithCors(404, { message: "Not Found", error: "Objective not found" }, cors);
    }

    const projectId = (obj as { project_id: string }).project_id;
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify project" }, cors);
    }
    if (!project) {
      return jsonWithCors(404, { message: "Not Found", error: "Project not found" }, cors);
    }

    const teamId = (project as { team_id: string }).team_id;

    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (memberErr) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only edit objectives in your own team" }, cors);
    }

    const teamMemberId = (member as { id: string }).id;

    cleanupExpired();
    const now = Date.now();
    const existing = locks.get(objectiveId);

    if (existing) {
      if (existing.userId !== userId && existing.teamMemberId !== teamMemberId && existing.expiresAt > now) {
        return jsonWithCors(423, { message: "Locked", error: "Objective is currently being edited by another user", locked_until: new Date(existing.expiresAt).toISOString() }, cors);
      }
      existing.expiresAt = now + LOCK_DURATION_MS;
      locks.set(objectiveId, existing);
      return jsonWithCors(200, { message: "Lock renewed", lock: { objective_id: objectiveId, expires_at: new Date(existing.expiresAt).toISOString(), duration_ms: LOCK_DURATION_MS } }, cors);
    }

    const record: LockRecord = { userId, teamMemberId, expiresAt: now + LOCK_DURATION_MS };
    locks.set(objectiveId, record);
    return jsonWithCors(201, { message: "Lock acquired", lock: { objective_id: objectiveId, expires_at: new Date(record.expiresAt).toISOString(), duration_ms: LOCK_DURATION_MS } }, cors);
  } catch (e) {
    return jsonWithCors(500, { message: "Internal Server Error", error: e instanceof Error ? e.message : 'Failed to acquire lock' }, cors);
  }
};

export const onRequestDelete = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Missing or invalid Authorization header" }, cors);
    }
    const token = authHeader.substring(7);
    const jwtSecret = env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Invalid or expired token" }, cors);
    }

    const userId = (payload.sub as string) || '';
    const objectiveId = params?.objectiveId as string;
    if (!objectiveId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing objectiveId" }, cors);
    }

    cleanupExpired();
    const existing = locks.get(objectiveId);
    if (!existing) {
      return jsonWithCors(404, { message: "Not Found", error: "No active lock for this objective" }, cors);
    }
    if (existing.userId !== userId) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only release your own lock" }, cors);
    }
    locks.delete(objectiveId);
    return jsonWithCors(200, { message: "Lock released", objective_id: objectiveId }, cors);
  } catch (e) {
    return jsonWithCors(500, { message: "Internal Server Error", error: e instanceof Error ? e.message : 'Failed to release lock' }, cors);
  }
};
