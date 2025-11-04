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

interface TeamMemberRow {
  id: string;
  user_id: string | null;
  team_id: string;
  name: string;
  email: string | null;
  role: string;
  is_virtual: boolean;
  invite_status: string | null;
  created_at?: string;
}

interface AssignmentRow {
  team_member_id: string;
  project_id: string;
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

    // Verify requester is a member of the team
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
      return jsonWithCors(403, { message: "Forbidden", error: "You can only view team members in your own team" }, cors);
    }

    // Fetch team members for the team
    const { data: rows, error } = await supabase
      .from('team_members')
      .select('id, user_id, team_id, name, email, role, is_virtual, invite_status')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase query error (team_members):', error);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to load team members" }, cors);
    }

    const members = (rows ?? []) as TeamMemberRow[];

    // Fetch project assignments for these members
    const memberIds = members.map((m) => m.id);
    const assignmentsByMember: Record<string, string[]> = {};

    if (memberIds.length > 0) {
      const { data: assignments, error: assignErr } = await supabase
        .from('team_member_project_assignments')
        .select('team_member_id, project_id')
        .in('team_member_id', memberIds);

      if (assignErr) {
        console.error('Supabase query error (assignments):', assignErr);
      } else {
        const assignmentsTyped = (assignments ?? []) as AssignmentRow[];
        for (const row of assignmentsTyped) {
          const tmId = row.team_member_id;
          const projectId = row.project_id;
          if (!assignmentsByMember[tmId]) assignmentsByMember[tmId] = [];
          assignmentsByMember[tmId].push(projectId);
        }
      }
    }

    // Map DB rows to UI shape
    const result = members.map((m) => {
      const roleMap: Record<string, string> = {
        'Account Owner': 'account_manager',
        'Account Manager': 'account_manager',
        'Project Owner': 'project_owner',
        'Objective Owner': 'objective_owner',
        'Team Member': 'team_member',
      };
      const inviteMap = (status: string | null): 'pending' | 'accepted' | null => {
        if (!status) return null;
        if (status === 'invite_pending') return 'pending';
        if (status === 'active') return 'accepted';
        return null;
      };
      return {
        id: m.id,
        userId: m.user_id ?? null,
        teamId: m.team_id,
        role: roleMap[m.role] || 'team_member',
        name: m.name || '',
        email: m.email ?? null,
        isVirtual: !!m.is_virtual,
        invitationStatus: inviteMap(m.invite_status || null),
        projectAssignments: assignmentsByMember[m.id] || [],
      };
    });

    return jsonWithCors(200, result, cors);
  } catch (error) {
    console.error('Error listing team members:', error);
    return jsonWithCors(500, { message: "Internal Server Error", error: error instanceof Error ? error.message : 'Failed to load team members' }, cors);
  }
};
