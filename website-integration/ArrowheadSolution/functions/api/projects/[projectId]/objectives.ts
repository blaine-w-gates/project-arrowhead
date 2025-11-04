import { createClient } from '@supabase/supabase-js';

type JwtPayload = { sub?: unknown; exp?: number };

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
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

async function verifyJwtWeb(token: string, secret: string): Promise<JwtPayload | null> {
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
    const payload = JSON.parse(payloadJson) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: cors });
};

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
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
      console.error("SUPABASE_JWT_SECRET not configured");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Invalid or expired token" }, cors);
    }

    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing project ID" }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Fetch project to verify team
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      console.error('Supabase query error (project):', projErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to list objectives" }, cors);
    }
    if (!project) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    // Verify membership
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only view objectives in your own team' }, cors);
    }

    const url = new URL(request.url);
    const includeArchived = (url.searchParams.get('include_archived') || 'false') === 'true';

    let query = supabase
      .from('objectives')
      .select('id, project_id, name, current_step, journey_status, brainstorm_data, choose_data, objectives_data, all_tasks_complete, target_completion_date, is_archived, created_at, updated_at')
      .eq('project_id', projectId);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: rows, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase query error (objectives):', error);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to list objectives" }, cors);
    }

    const objectives = (rows || []).map((r: {
      id: string;
      project_id: string;
      name: string;
      current_step: number;
      journey_status: string;
      brainstorm_data: Record<string, string> | null;
      choose_data: Record<string, string> | null;
      objectives_data: Record<string, string> | null;
      all_tasks_complete: boolean;
      target_completion_date: string | null;
      is_archived: boolean;
      created_at: string;
      updated_at: string;
    }) => ({
      id: r.id,
      name: r.name,
      status: r.is_archived ? 'paused' : (r.all_tasks_complete || r.journey_status === 'complete') ? 'completed' : 'active',
      completionStatus: r.all_tasks_complete,
      estimatedCompletionDate: r.target_completion_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      // Extra fields for journey consumers
      currentStep: r.current_step,
      journeyStatus: r.journey_status,
      brainstormData: r.brainstorm_data,
      chooseData: r.choose_data,
      objectivesData: r.objectives_data,
    }));

    return jsonWithCors(200, objectives, cors);
  } catch (error) {
    console.error('Error listing objectives:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to list objectives' }, cors);
  }
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
      console.error("SUPABASE_JWT_SECRET not configured");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const payload = await verifyJwtWeb(token, jwtSecret);
    if (!payload) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Invalid or expired token" }, cors);
    }

    const projectId = params?.projectId as string;
    if (!projectId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing project ID" }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Fetch project to verify team
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr) {
      console.error('Supabase query error (project):', projErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to create objective" }, cors);
    }
    if (!project) {
      return jsonWithCors(404, { message: 'Not Found', error: 'Project not found' }, cors);
    }

    // Verify membership & permissions (Project Owner+, Objective Owner creation allowed by server rules; we require Project Owner+ here)
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', project.team_id)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'You can only create objectives in your own team' }, cors);
    }
    const role = String(member.role);
    const canCreate = role === 'Account Owner' || role === 'Account Manager' || role === 'Project Owner';
    if (!canCreate) {
      return jsonWithCors(403, { message: 'Forbidden', error: 'Insufficient permissions to create objectives' }, cors);
    }

    // Parse body
    interface CreateObjectiveBody { name?: string; start_with_brainstorm?: boolean; target_completion_date?: string }
    let body: CreateObjectiveBody;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Invalid JSON body' }, cors);
    }

    const name = (body.name || '').toString().trim();
    if (!name) {
      return jsonWithCors(400, { message: 'Bad Request', error: 'Objective name is required' }, cors);
    }

    const startWithBrainstorm = body.start_with_brainstorm !== false; // default true

    const { data: inserted, error: insErr } = await supabase
      .from('objectives')
      .insert([
        {
          project_id: projectId,
          name,
          current_step: startWithBrainstorm ? 1 : 11,
          journey_status: 'draft',
          brainstorm_data: null,
          choose_data: null,
          objectives_data: null,
          target_completion_date: body.target_completion_date ?? null,
          all_tasks_complete: false,
          is_archived: false,
        },
      ])
      .select('id')
      .single();

    if (insErr) {
      console.error('Supabase insert error (objective):', insErr);
      return jsonWithCors(500, { message: 'Internal Server Error', error: 'Failed to create objective' }, cors);
    }

    return jsonWithCors(201, { id: inserted.id }, cors);
  } catch (error) {
    console.error('Error creating objective:', error);
    return jsonWithCors(500, { message: 'Internal Server Error', error: error instanceof Error ? error.message : 'Failed to create objective' }, cors);
  }
};
