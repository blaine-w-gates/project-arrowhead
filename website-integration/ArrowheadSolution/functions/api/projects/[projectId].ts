import { createClient } from '@supabase/supabase-js';

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

type JwtPayload = { sub?: unknown; exp?: number };
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

export const onRequestPut = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
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

    // Fetch existing project
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('id, team_id, name')
      .eq('id', projectId)
      .maybeSingle();
    if (fetchErr) {
      console.error('Supabase fetch error (project):', fetchErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to update project" }, cors);
    }
    if (!existing) {
      return jsonWithCors(404, { message: "Not Found", error: "Project not found" }, cors);
    }

    // Verify membership & permissions
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', existing.team_id)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only edit projects in your own team" }, cors);
    }
    const role = String(member.role);
    const canEdit = role === 'Account Owner' || role === 'Account Manager' || role === 'Project Owner';
    if (!canEdit) {
      return jsonWithCors(403, { message: "Forbidden", error: "Insufficient permissions to edit projects" }, cors);
    }

    // Parse body
    interface UpdateProjectBody {
      name?: string;
      vision_data?: unknown;
      vision?: unknown;
      completion_status?: boolean;
      estimated_completion_date?: string | null;
      is_archived?: boolean;
    }
    let body: UpdateProjectBody;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(400, { message: "Bad Request", error: "Invalid JSON body" }, cors);
    }

    // Uniqueness check if name changes
    if (typeof body.name === 'string' && body.name.trim() && body.name.trim() !== existing.name) {
      const { data: dup, error: dupErr } = await supabase
        .from('projects')
        .select('id')
        .eq('team_id', existing.team_id)
        .eq('name', body.name.trim())
        .limit(1)
        .maybeSingle();
      if (dupErr) {
        console.error('Supabase query error (duplicate name):', dupErr);
        return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to update project" }, cors);
      }
      if (dup) {
        return jsonWithCors(409, { message: "Conflict", error: "A project with this name already exists in your team" }, cors);
      }
    }

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name);
    if (body.vision_data !== undefined) update.vision_data = body.vision_data;
    else if (body.vision !== undefined) update.vision_data = body.vision;
    if (body.completion_status !== undefined) update.completion_status = body.completion_status ? 'completed' : 'not_started';
    if (body.estimated_completion_date !== undefined) update.estimated_completion_date = body.estimated_completion_date;
    if (body.is_archived !== undefined) update.is_archived = !!body.is_archived;

    const { data: updated, error: updErr } = await supabase
      .from('projects')
      .update(update)
      .eq('id', projectId)
      .select('id, team_id, name, vision_data, completion_status, estimated_completion_date, is_archived, created_at, updated_at')
      .single();
    if (updErr) {
      console.error('Supabase update error (project):', updErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to update project" }, cors);
    }

    return jsonWithCors(200, { message: 'Project updated successfully', project: updated }, cors);
  } catch (error) {
    console.error('Error updating project:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to update project' }, cors);
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

    // Fetch existing project to get team
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('id, team_id')
      .eq('id', projectId)
      .maybeSingle();
    if (fetchErr) {
      console.error('Supabase fetch error (project):', fetchErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to delete project" }, cors);
    }
    if (!existing) {
      return jsonWithCors(404, { message: "Not Found", error: "Project not found" }, cors);
    }

    // Verify membership & permissions
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const { data: member, error: memberErr } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', existing.team_id)
      .maybeSingle();
    if (memberErr) {
      console.error('Supabase query error (team_members check):', memberErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to verify membership" }, cors);
    }
    if (!member) {
      return jsonWithCors(403, { message: "Forbidden", error: "You can only delete projects in your own team" }, cors);
    }
    const role = String(member.role);
    const canDelete = role === 'Account Owner' || role === 'Account Manager' || role === 'Project Owner';
    if (!canDelete) {
      return jsonWithCors(403, { message: "Forbidden", error: "Insufficient permissions to delete projects" }, cors);
    }

    // Check if project has objectives
    const { count: objectivesCount, error: countErr } = await supabase
      .from('objectives')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (countErr) {
      console.error('Supabase count error (objectives):', countErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to delete project" }, cors);
    }
    if ((objectivesCount || 0) > 0) {
      return jsonWithCors(400, {
        message: 'Bad Request',
        error: `This project has ${objectivesCount} objective(s). Archive it first or delete the objectives/tasks.`,
        details: { objectives_count: objectivesCount },
      }, cors);
    }

    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (delErr) {
      console.error('Supabase delete error (project):', delErr);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to delete project" }, cors);
    }

    return jsonWithCors(200, { message: 'Project deleted successfully', project_id: projectId }, cors);
  } catch (error) {
    console.error('Error deleting project:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to delete project' }, cors);
  }
};
