import { createClient } from '@supabase/supabase-js';

// CORS utilities (kept consistent with other CF functions in this repo)
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
  const site = env.PUBLIC_SITE_URL ? env.PUBLIC_SITE_URL.replace(/\/$/, '') : '';
  if (site) set.add(site);
  const allowedOrigins = env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    allowedOrigins
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((o) => set.add(o.replace(/\/$/, '')));
  }
  set.add('http://localhost:5173');
  set.add('http://127.0.0.1:5173');
  set.add('http://localhost:5000');
  return set;
}

function buildCorsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  const o = origin ? origin.replace(/\/$/, '') : null;
  if (o && (allowed.has(o) || o.endsWith('.project-arrowhead.pages.dev') || o === 'https://project-arrowhead.pages.dev')) {
    headers['Access-Control-Allow-Origin'] = o;
  }
  return headers;
}

function jsonWithCors(status: number, data: unknown, cors: HeadersInit, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(cors as Record<string, string>),
      ...((extraHeaders as Record<string, string>) || {}),
    },
  });
}

// Minimal JWT verification compatible with Cloudflare Workers (HMAC SHA-256)
async function verifyJwtWeb(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts;
    const data = `${headerPart}.${payloadPart}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(atob(signaturePart.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
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

type IncomingUpdateBody = {
  name?: unknown;
  vision_data?: unknown;
  vision?: unknown;
  completion_status?: unknown; // boolean | 'completed' | 'not_started'
  estimated_completion_date?: unknown; // string | number | Date | null
  is_archived?: unknown; // boolean
};

type NormalizedUpdate = {
  name?: string;
  vision_data?: unknown | null;
  completion_status?: 'completed' | 'not_started';
  estimated_completion_date?: string | null; // ISO string or null
  is_archived?: boolean;
};

function pickUpdateFields(bodyUnknown: unknown): NormalizedUpdate {
  const update: NormalizedUpdate = {};
  const body = (bodyUnknown ?? {}) as IncomingUpdateBody;
  if (body && typeof body === 'object') {
    if (typeof body.name === 'string') update.name = body.name.trim();

    if (Object.prototype.hasOwnProperty.call(body, 'vision_data')) {
      update.vision_data = body.vision_data ?? null;
    } else if (Object.prototype.hasOwnProperty.call(body, 'vision')) {
      // Accept alternate key for parity with server router
      update.vision_data = body.vision ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'completion_status')) {
      // Accept boolean or string
      const v = body.completion_status as unknown;
      if (typeof v === 'boolean') update.completion_status = v ? 'completed' : 'not_started';
      else if (v === 'completed' || v === 'not_started') update.completion_status = v;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'estimated_completion_date')) {
      const v = body.estimated_completion_date as unknown;
      if (v === null || v === undefined || v === '') {
        update.estimated_completion_date = null;
      } else if (v instanceof Date) {
        update.estimated_completion_date = v.toISOString();
      } else if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        update.estimated_completion_date = isNaN(d.getTime()) ? null : d.toISOString();
      } else {
        update.estimated_completion_date = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'is_archived')) {
      update.is_archived = !!(body.is_archived as unknown);
    }
  }
  return update;
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), Allow: 'PUT, DELETE, OPTIONS, HEAD' } });
};

export const onRequestPut = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Missing or invalid Authorization header' }, cors);
    }
    const token = authHeader.substring(7);
    const jwtSecret = env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Invalid or expired token' }, cors);
    }

    const userId = (payload.sub as string) || '';
    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Missing projectId' }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Load project -> team
    const { data: projectRow, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id, name')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify project' }, cors);
    }
    if (!projectRow) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    const teamId = (projectRow as { team_id: string }).team_id;

    // Verify membership and role
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (memberErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify membership' }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only edit projects in your own team' }, cors);
    }
    const role = (member as { role?: string }).role || '';
    const allowedRoles = new Set(['Account Owner', 'Account Manager', 'Project Owner']);
    if (!allowedRoles.has(role)) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'Insufficient permissions to edit projects' }, cors);
    }

    // Parse and validate update body
    let bodyUnknown: unknown;
    try {
      bodyUnknown = await request.json();
    } catch {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Invalid JSON body' }, cors);
    }

    const update = pickUpdateFields(bodyUnknown);
    if (Object.keys(update).length === 0) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'No fields to update' }, cors);
    }

    // Name uniqueness within team (if changing)
    if (typeof update.name === 'string' && update.name.length > 0 && update.name !== (projectRow as { name: string }).name) {
      const { data: dupList, error: dupErr } = await supabase
        .from('projects')
        .select('id')
        .eq('team_id', teamId)
        .eq('name', update.name)
        .neq('id', projectId)
        .limit(1);
      if (dupErr) {
        return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to check name uniqueness' }, cors);
      }
      if (dupList && dupList.length > 0) {
        return jsonWithCors(409, { message: 'Conflict', error: 'A project with this name already exists in your team' }, cors);
      }
    }

    // Build update object for Supabase
    const sbUpdate: Record<string, unknown> = {};
    if (update.name !== undefined) sbUpdate.name = update.name;
    if (update.vision_data !== undefined) sbUpdate.vision_data = update.vision_data;
    if (update.completion_status !== undefined) sbUpdate.completion_status = update.completion_status;
    if (Object.prototype.hasOwnProperty.call(update, 'estimated_completion_date')) sbUpdate.estimated_completion_date = update.estimated_completion_date;
    if (update.is_archived !== undefined) sbUpdate.is_archived = update.is_archived;

    const { data: updated, error: updErr } = await supabase
      .from('projects')
      .update(sbUpdate)
      .eq('id', projectId)
      .select()
      .maybeSingle();

    if (updErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to update project' }, cors);
    }

    return jsonWithCors(200, { message: 'Project updated successfully', project: updated }, cors);
  } catch (e) {
    return jsonWithCors(500, { message: 'Internal Server Error', error: e instanceof Error ? e.message : 'Failed to update project' }, cors);
  }
};

export const onRequestDelete = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Missing or invalid Authorization header' }, cors);
    }
    const token = authHeader.substring(7);
    const jwtSecret = env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Invalid or expired token' }, cors);
    }

    const userId = (payload.sub as string) || '';
    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Missing projectId' }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Load project -> team
    const { data: projectRow, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify project' }, cors);
    }
    if (!projectRow) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    const teamId = (projectRow as { team_id: string }).team_id;

    // Verify membership and role
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (memberErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify membership' }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only delete projects in your own team' }, cors);
    }
    const role = (member as { role?: string }).role || '';
    const allowedRoles = new Set(['Account Owner', 'Account Manager', 'Project Owner']);
    if (!allowedRoles.has(role)) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'Insufficient permissions to delete projects' }, cors);
    }

    // Business rule: only empty projects can be deleted
    const { count: objCount, error: countErr } = await supabase
      .from('objectives')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (countErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to check project objectives' }, cors);
    }
    if ((objCount ?? 0) > 0) {
      return jsonWithCors(400, {
        message: 'Bad Request',
        error: `This project has ${objCount} objective(s). Archive it first or delete the objectives.`,
        details: { objectives_count: objCount },
      }, cors);
    }

    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (delErr) {
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to delete project' }, cors);
    }

    // Keep 200 JSON to match existing UI expectations (avoids Unexpected end of JSON input)
    return jsonWithCors(200, { message: 'Project deleted successfully', project_id: projectId }, cors);
  } catch (e) {
    return jsonWithCors(500, { message: 'Internal Server Error', error: e instanceof Error ? e.message : 'Failed to delete project' }, cors);
  }
};
