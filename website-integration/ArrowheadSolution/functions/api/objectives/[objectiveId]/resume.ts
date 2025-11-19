/**
 * Cloudflare Pages Function: GET /api/objectives/:objectiveId/resume
 * 
 * Fetch objective journey state to resume editing
 * Returns current step, journey data, and lock status
 * 
 * Parity with: server/api/objectives.ts GET /objectives/:objectiveId/resume
 */

import { createClient } from '@supabase/supabase-js';

type LockRecord = {
  userId: string;
  teamMemberId: string;
  expiresAt: number; // epoch ms
};

// Shared lock store (imported from lock.ts via module closure)
// In production, this should be Redis or KV store
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
    "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
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
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cors as Record<string, string>),
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

function getLock(objectiveId: string): LockRecord | null {
  const lock = locks.get(objectiveId);
  if (!lock) return null;
  const now = Date.now();
  if (lock.expiresAt < now) {
    locks.delete(objectiveId);
    return null;
  }
  return lock;
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: cors });
};

export const onRequestGet = async ({ request, params, env }: { request: Request; params: Record<string, string>; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  const objectiveId = params.objectiveId as string;
  if (!objectiveId) {
    return jsonWithCors(400, { error: 'Bad Request', message: 'Objective ID is required' }, cors);
  }

  // Verify JWT
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonWithCors(401, { error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, cors);
  }

  const token = authHeader.substring(7);
  const jwtSecret = env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error('SUPABASE_JWT_SECRET not configured');
    return jsonWithCors(500, { error: 'Internal Server Error', message: 'Server configuration error' }, cors);
  }

  const payload = await verifyJwtWeb(token, jwtSecret);
  if (!payload) {
    return jsonWithCors(401, { error: 'Unauthorized', message: 'Invalid or expired token' }, cors);
  }

  const userId = payload.sub as string | undefined;
  if (!userId) {
    return jsonWithCors(401, { error: 'Unauthorized', message: 'Invalid token payload' }, cors);
  }

  // Initialize Supabase client
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing');
    return jsonWithCors(500, { error: 'Internal Server Error', message: 'Server configuration error' }, cors);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch objective
    const { data: objective, error: objError } = await supabase
      .from('objectives')
      .select('id, name, current_step, journey_status, brainstorm_data, choose_data, objectives_data, target_completion_date, project_id')
      .eq('id', objectiveId)
      .single();

    if (objError || !objective) {
      console.error('Objective not found:', objError);
      return jsonWithCors(404, { error: 'Not Found', message: 'Objective not found or you don\'t have access' }, cors);
    }

    // Check membership for access control
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, team_id, role')
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return jsonWithCors(403, { error: 'Forbidden', message: 'You don\'t have access to this team' }, cors);
    }

    // Verify project belongs to user's team
    const { data: project } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', objective.project_id)
      .single();

    if (!project || project.team_id !== membership.team_id) {
      return jsonWithCors(404, { error: 'Not Found', message: 'Objective not found or you don\'t have access' }, cors);
    }

    // Check lock status
    const lock = getLock(objectiveId);
    const isLockedByOther = lock && lock.teamMemberId !== membership.id;
    const lockedByCurrentUser = lock?.teamMemberId === membership.id;

    // Return response matching server contract
    return jsonWithCors(200, {
      objective: {
        id: objective.id,
        name: objective.name,
        current_step: objective.current_step,
        journey_status: objective.journey_status,
        brainstorm_data: objective.brainstorm_data,
        choose_data: objective.choose_data,
        objectives_data: objective.objectives_data,
        target_completion_date: objective.target_completion_date,
      },
      is_locked: isLockedByOther,
      locked_by_current_user: lockedByCurrentUser,
      lock_expires_at: lock ? new Date(lock.expiresAt).toISOString() : null,
    }, cors);
  } catch (error) {
    console.error('Error fetching objective:', error);
    return jsonWithCors(500, { error: 'Internal Server Error', message: 'Failed to fetch objective' }, cors);
  }
};
