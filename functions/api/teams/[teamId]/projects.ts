import { createClient } from '@supabase/supabase-js';

interface ProjectRow {
  id: string;
  team_id: string;
  name: string;
  vision_data: unknown | null;
  completion_status: string | null;
  estimated_completion_date: string | null;
  is_archived: boolean;
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
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

    const userId = payload.sub as string;
    const teamId = params?.teamId as string;
    if (!userId || !teamId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing user or team" }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify membership and permissions
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members get):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only create projects in your own team" }, cors);
    }

    const role = (member as { role?: string }).role || '';
    const allowedRoles = new Set(["Account Owner", "Account Manager", "Project Owner"]);
    if (!allowedRoles.has(role)) {
      return jsonWithCors(403, { message: "Forbidden", error: "Insufficient permissions to create projects" }, cors);
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(400, { message: "Bad Request", error: "Invalid JSON body" }, cors);
    }

    const parsed = (body ?? {}) as { name?: unknown; vision?: unknown; estimated_completion_date?: unknown };
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    if (!name) {
      return jsonWithCors(400, { message: "Bad Request", error: "'name' is required" }, cors);
    }
    const vision = parsed.vision && typeof parsed.vision === 'object' ? parsed.vision : null;
    const estimatedDate = typeof parsed.estimated_completion_date === 'string' && parsed.estimated_completion_date
      ? parsed.estimated_completion_date
      : null;

    // Check duplicate name within team
    const { data: dup, error: dupErr } = await supabase
      .from('projects')
      .select('id')
      .eq('team_id', teamId)
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    if (dupErr) {
      console.error('Supabase query error (duplicate name check):', dupErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to validate project name" }, cors);
    }
    if (dup) {
      return jsonWithCors(409, { message: "Conflict", error: "A project with this name already exists in your team" }, cors);
    }

    // Insert project
    const { data: inserted, error: insertErr } = await supabase
      .from('projects')
      .insert({
        team_id: teamId,
        name,
        vision_data: vision,
        estimated_completion_date: estimatedDate,
        is_archived: false,
        completion_status: 'not_started',
      })
      .select('id, team_id, name, vision_data, completion_status, estimated_completion_date, is_archived, created_at, updated_at')
      .single();
    if (insertErr) {
      console.error('Supabase insert error (projects):', insertErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to create project" }, cors);
    }

    const p = inserted as ProjectRow;
    const ui = {
      id: p.id,
      name: p.name,
      isArchived: !!p.is_archived,
      visionData: p.vision_data || null,
      completionStatus: p.completion_status === 'completed',
      estimatedCompletionDate: p.estimated_completion_date || null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };

    return jsonWithCors(201, ui, cors, { 'Location': `/api/projects/${p.id}` });
  } catch (error) {
    console.error('Error creating project:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to create project' }, cors);
  }
};

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
    const userId = payload.sub as string;
    const teamId = params?.teamId as string;
    if (!userId || !teamId) {
      return jsonWithCors(400, { message: "Bad Request", error: "Missing user or team" }, cors);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: membership, error: memberErr } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!membership) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only view projects in your own team" }, cors);
    }

    const url = new URL(request.url);
    const includeArchived = (url.searchParams.get('include_archived') || 'false') === 'true';

    let query = supabase
      .from('projects')
      .select('id, team_id, name, vision_data, completion_status, estimated_completion_date, is_archived, created_at, updated_at')
      .eq('team_id', teamId);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: rows, error } = await query.order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase query error (projects):', error);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to list projects" }, cors);
    }

    const rowsTyped = (rows ?? []) as ProjectRow[];
    const projects = rowsTyped.map((r) => ({
      id: r.id,
      name: r.name,
      isArchived: !!r.is_archived,
      visionData: r.vision_data || null,
      completionStatus: r.completion_status === 'completed',
      estimatedCompletionDate: r.estimated_completion_date || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return jsonWithCors(200, projects, cors);
  } catch (error) {
    console.error('Error listing projects:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to list projects' }, cors);
  }
};
