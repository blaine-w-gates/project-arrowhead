// Cloudflare Pages Function: Auth - Get Profile
// Path: /api/auth/profile
// Method: GET
// Returns authenticated user's profile and team information

import { createClient } from '@supabase/supabase-js';

// Row types for Supabase queries
type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  is_virtual: boolean;
};

type TeamRow = {
  id: string;
  name: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
};

// CORS utilities
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
      ...(extraHeaders as Record<string, string> || {}) 
    },
  });
}

// JWT verification
async function verifyJwtWeb(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const headerPart = parts[0];
    const payloadPart = parts[1];
    const signaturePart = parts[2];
    
    const data = `${headerPart}.${payloadPart}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', 
      enc.encode(secret), 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['verify']
    );
    
    // Decode signature
    const sigBytes = Uint8Array.from(atob(signaturePart.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(data)
    );
    
    if (!valid) return null;
    
    // Decode payload
    const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

// OPTIONS handler for CORS preflight
export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: cors });
};

// GET handler for profile
export const onRequestGet = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));
  const allowed = parseAllowedOrigins(env);
  const cors = buildCorsHeaders(origin, allowed);

  try {
    // Extract and verify JWT
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
    if (!userId) {
      return jsonWithCors(401, { message: "Unauthorized", error: "Invalid token payload" }, cors);
    }

    // Initialize Supabase Admin client (bypasses RLS on server)
    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase env not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
      return jsonWithCors(500, { message: "Internal Server Error", error: "Server misconfiguration" }, cors);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Find team member by Supabase user ID
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('id, team_id, user_id, name, email, role, is_virtual')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    const member = memberData as TeamMemberRow | null;

    if (memberError) {
      console.error('Supabase query error (team_members):', memberError);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to load profile" }, cors);
    }

    if (!member) {
      return jsonWithCors(404, { message: "Not Found", error: "Team member not found. User may not be part of a team yet." }, cors);
    }

    // 2) Fetch team details
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, name, subscription_status, trial_ends_at')
      .eq('id', member.team_id)
      .limit(1)
      .maybeSingle();
    const team = teamData as TeamRow | null;

    if (teamError) {
      console.error('Supabase query error (teams):', teamError);
      return jsonWithCors(500, { message: "Internal Server Error", error: "Failed to load team info" }, cors);
    }

    // Calculate trial days left if on trial
    let daysLeftInTrial: number | null = null;
    if (team?.subscription_status === 'trialing' && team?.trial_ends_at) {
      const now = new Date();
      const trialEnd = new Date(team.trial_ends_at as unknown as string);
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysLeftInTrial = Math.max(0, diffDays);
    }

    // Return profile data
    return jsonWithCors(200, {
      userId,
      email: member.email || '',
      teamMemberId: member.id,
      teamId: member.team_id,
      teamName: team?.name || '',
      role: member.role,
      name: member.name,
      isVirtual: member.is_virtual,
      // Subscription info for trial logic
      subscriptionStatus: team?.subscription_status || 'inactive',
      trialEndsAt: team?.trial_ends_at || null,
      daysLeftInTrial,
    }, cors);

  } catch (error) {
    console.error('Error fetching profile:', error);
    return jsonWithCors(500, { 
      message: "Internal Server Error", 
      error: error instanceof Error ? error.message : "Failed to fetch profile" 
    }, cors);
  }
};
