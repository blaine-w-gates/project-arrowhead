import { createClient } from '@supabase/supabase-js';
import { getLock } from '../_lockStore';

type JwtPayload = { sub?: unknown; exp?: number };

function normalizeOrigin(o: string | null): string | null {
  if (!o) return null;
  try { const u = new URL(o); return `${u.protocol}//${u.host}`; } catch { return null; }
}
function parseAllowedOrigins(env: { [key: string]: string | undefined }): Set<string> {
  const set = new Set<string>();
  const site = env.PUBLIC_SITE_URL ? env.PUBLIC_SITE_URL.replace(/\/$/, "") : "";
  if (site) set.add(site);
  const allowedOrigins = env.ALLOWED_ORIGINS;
  if (allowedOrigins) allowedOrigins.split(',').map(s=>s.trim()).filter(Boolean).forEach(o=>set.add(o.replace(/\/$/,'')));
  set.add('http://localhost:5173'); set.add('http://127.0.0.1:5173'); set.add('http://localhost:5000');
  return set;
}
function buildCorsHeaders(origin: string | null, allowed: Set<string>): HeadersInit {
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
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
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...(cors as Record<string,string>), ...((extraHeaders as Record<string,string>)||{}) }});
}
async function verifyJwtWeb(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.'); if (parts.length !== 3) return null;
    const [h,p,s] = parts; const data = `${h}.${p}`; const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data)); if (!valid) return null;
    const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null; return payload;
  } catch { return null; }
}

export const onRequestOptions = async ({ request, env }: { request: Request; env: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin')); const allowed = parseAllowedOrigins(env); const cors = buildCorsHeaders(origin, allowed);
  return new Response(null, { status: 204, headers: cors });
};

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Record<string, string>; params: Record<string, string> }) => {
  const origin = normalizeOrigin(request.headers.get('Origin')); const allowed = parseAllowedOrigins(env); const cors = buildCorsHeaders(origin, allowed);
  try {
    const authHeader = request.headers.get('Authorization'); if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonWithCors(401, { message:'Unauthorized', error:'Missing or invalid Authorization header' }, cors);
    const token = authHeader.substring(7); const jwtSecret = env.SUPABASE_JWT_SECRET; if (!jwtSecret) return jsonWithCors(500,{message:'Internal Server Error', error:'Server misconfiguration'}, cors);
    const payload = await verifyJwtWeb(token, jwtSecret); if (!payload) return jsonWithCors(401,{message:'Unauthorized', error:'Invalid or expired token'}, cors);

    const objectiveId = params?.objectiveId as string; if (!objectiveId) return jsonWithCors(400,{message:'Bad Request', error:'Missing objective ID'}, cors);

    const supabaseUrl = env.SUPABASE_URL; const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return jsonWithCors(500,{message:'Internal Server Error', error:'Server misconfiguration'}, cors);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken:false, persistSession:false } });

    // Fetch objective and project team
    const { data: obj, error: objErr } = await supabase
      .from('objectives')
      .select('id, project_id, name, current_step, journey_status, brainstorm_data, choose_data, objectives_data, target_completion_date')
      .eq('id', objectiveId)
      .maybeSingle();
    if (objErr) { console.error('Supabase fetch error (objective resume):', objErr); return jsonWithCors(500,{message:'Internal Server Error', error:'Failed to fetch objective'}, cors); }
    if (!obj) return jsonWithCors(404,{message:'Not Found', error:'Objective not found'}, cors);

    const { data: proj, error: projErr } = await supabase.from('projects').select('team_id').eq('id', obj.project_id).maybeSingle();
    if (projErr) { console.error('Supabase fetch error (project):', projErr); return jsonWithCors(500,{message:'Internal Server Error', error:'Failed to fetch objective'}, cors); }
    if (!proj) return jsonWithCors(404,{message:'Not Found', error:'Parent project not found'}, cors);

    // Verify membership
    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const { data: member, error: memErr } = await supabase.from('team_members').select('id').eq('user_id', userId).eq('team_id', proj.team_id).maybeSingle();
    if (memErr) { console.error('Supabase query error (team_members check):', memErr); return jsonWithCors(500,{message:'Internal Server Error', error:'Failed to verify membership'}, cors); }
    if (!member) return jsonWithCors(403,{message:'Forbidden', error:'You can only access objectives in your own team'}, cors);

    // Lock info
    const lock = getLock(objectiveId);
    const isLockedByOther = !!(lock && lock.teamMemberId !== member.id);

    // Map to client-friendly shape expected by ObjectiveJourneyWizard
    const response = {
      id: obj.id,
      projectId: obj.project_id,
      name: obj.name,
      targetDate: obj.target_completion_date,
      currentStep: obj.current_step,
      journeyStatus: obj.journey_status as 'draft' | 'in_progress' | 'complete',
      brainstormData: obj.brainstorm_data as Record<string,string> | null,
      chooseData: obj.choose_data as Record<string,string> | null,
      objectivesData: obj.objectives_data as Record<string,string> | null,
      startWithBrainstorm: (obj.current_step ?? 1) < 11,
      editLock: isLockedByOther ? {
        lockedBy: lock?.userId || null,
        lockedByName: null,
        lockedAt: lock ? new Date(lock.expiresAt).toISOString() : null,
      } : null,
    };

    return jsonWithCors(200, response, cors);
  } catch (error) {
    console.error('Error resuming objective:', error);
    return jsonWithCors(500,{message:'Internal Server Error', error: error instanceof Error ? error.message : 'Failed to resume objective'}, cors);
  }
};
