import { createClient } from '@supabase/supabase-js';

interface ObjectiveRow {
  id: string;
  project_id: string;
  name: string;
  journey_status: string | null;
  current_step?: number | null;
  target_completion_date?: string | null;
  actual_completion_date?: string | null;
  is_archived?: boolean | null;
  created_at: string;
  updated_at: string;
}

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
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

function mapObjective(row: ObjectiveRow) {
  const js = (row.journey_status || '').toLowerCase();
  const completed = js === 'complete' || js === 'completed';
  const status = js === 'paused' ? 'paused' : completed ? 'completed' : 'active';
  return {
    id: row.id,
    name: row.name,
    status,
    completionStatus: completed,
    estimatedCompletionDate: row.target_completion_date || null,
    actualCompletionDate: row.actual_completion_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: { ...(cors as Record<string, string>), Allow: 'GET, POST, OPTIONS, HEAD' } });
};

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
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
      console.error('SUPABASE_JWT_SECRET not configured');
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Invalid or expired token' }, cors);
    }

    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Missing projectId' }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Resolve project -> team to verify membership
    const { data: projectRow, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      console.error('Supabase query error (projects get):', projErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify project' }, cors);
    }
    if (!projectRow) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    const userId = (payload.sub as string) || '';
    const teamId = (projectRow as { team_id: string }).team_id;

    // Verify requester membership
    const { data: membership, error: memberErr } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify membership' }, cors);
    }
    if (!membership) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only view objectives in your own team' }, cors);
    }

    // Parse filters
    const url = new URL(request.url);
    const includeArchived = (url.searchParams.get('include_archived') || 'false') === 'true';
    const journey = (url.searchParams.get('journey_status') || 'all').toLowerCase();

    let query = supabase
      .from('objectives')
      .select('id, project_id, name, journey_status, target_completion_date, actual_completion_date, is_archived, created_at, updated_at')
      .eq('project_id', projectId);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    if (journey !== 'all') {
      query = query.eq('journey_status', journey);
    }

    const { data: rows, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase query error (objectives list):', error);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to list objectives' }, cors);
    }

    const list = ((rows ?? []) as ObjectiveRow[]).map(mapObjective);
    return jsonWithCors(200, list, cors);
  } catch (e) {
    console.error('Error listing objectives:', e);
    return jsonWithCors(500, { message: 'Internal Server Error', error: e instanceof Error ? e.message : 'Failed to list objectives' }, cors);
  }
};

export const onRequestPost = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
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
      console.error('SUPABASE_JWT_SECRET not configured');
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: 'Unauthorized', error: 'Invalid or expired token' }, cors);
    }

    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Missing projectId' }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Server misconfiguration' }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Resolve project -> team to verify membership and role
    const { data: projectRow, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      console.error('Supabase query error (projects get):', projErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify project' }, cors);
    }
    if (!projectRow) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    const userId = (payload.sub as string) || '';
    const teamId = (projectRow as { team_id: string }).team_id;

    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members get):', memberErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to verify membership' }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only create objectives in your own team' }, cors);
    }

    const role = (member as { role?: string }).role || '';
    const allowedRoles = new Set(['Account Owner', 'Account Manager', 'Project Owner']);
    if (!allowedRoles.has(role)) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'Insufficient permissions to create objectives' }, cors);
    }

    // Parse body
    type CreateBody = { name?: string; start_with_brainstorm?: boolean; target_date?: string };
    let body: CreateBody = {};
    try { body = (await request.json()) as CreateBody; } catch { body = {}; }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return jsonWithCors(400, { message: 'Bad Request', error: "'name' is required" }, cors);
    }
    const startWithBrainstorm = !!body.start_with_brainstorm;
    const targetDate = typeof body.target_date === 'string' && body.target_date ? body.target_date : null;

    const initialStep = startWithBrainstorm ? 1 : 11;

    const { data: inserted, error: insErr } = await supabase
      .from('objectives')
      .insert({
        project_id: projectId,
        name,
        current_step: initialStep,
        journey_status: 'draft',
        target_completion_date: targetDate,
        is_archived: false,
      })
      .select('id, project_id, name, journey_status, target_completion_date, actual_completion_date, is_archived, created_at, updated_at')
      .single();

    if (insErr) {
      console.error('Supabase insert error (objectives):', insErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to create objective' }, cors);
    }

    const obj = mapObjective(inserted as ObjectiveRow);
    // Frontend expects at least { id } for follow-up flow
    return jsonWithCors(201, { ...obj }, cors, { Location: `/api/objectives/${obj.id}` });
  } catch (e) {
    console.error('Error creating objective:', e);
    return jsonWithCors(500, { message: 'Internal Server Error', error: e instanceof Error ? e.message : 'Failed to create objective' }, cors);
  }
};
