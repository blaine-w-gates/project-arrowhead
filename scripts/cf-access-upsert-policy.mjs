#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_API_KEY, CF_API_EMAIL, CF_ACCOUNT_ID } = env;
if (!CF_ACCOUNT_ID || (!CF_API_TOKEN && !(CF_API_KEY && CF_API_EMAIL))) {
  console.error('[cf-access-upsert-policy] Missing env. Required: CF_ACCOUNT_ID and (CF_API_TOKEN or CF_API_KEY+CF_API_EMAIL)');
  process.exit(2);
}

// Args
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const appDomain = getArg('--app-domain'); // e.g. project-arrowhead.pages.dev or project-arrowhead.pages.dev/admin
const policyName = getArg('--policy-name') || 'Allow Service Token';
const serviceTokenIdArg = getArg('--service-token-id');
const serviceTokenClientId = getArg('--service-token-client-id'); // alternative lookup by client_id
const fallbackAnyValid = args.includes('--fallback-any-valid-service-token');

if (!appDomain) {
  console.error('[cf-access-upsert-policy] Usage: cf-access-upsert-policy --app-domain <domain> [--policy-name <name>] [--service-token-id <uuid> | --service-token-client-id <client_id>]');
  process.exit(2);
}

const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access`;

function authHeaders() {
  if (CF_API_TOKEN) {
    return { 'Authorization': `Bearer ${CF_API_TOKEN}` };
  }
  if (CF_API_KEY && CF_API_EMAIL) {
    return { 'X-Auth-Email': CF_API_EMAIL, 'X-Auth-Key': CF_API_KEY };
  }
  return {};
}

async function cfFetch(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[cf-access-upsert-policy] API ${init.method || 'GET'} ${path} failed:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

// Raw fetch that does NOT exit on failure; used to try variant payloads safely
async function cfFetchRaw(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function stripScheme(d) {
  if (!d) return '';
  return d.replace(/^https?:\/\//, '').trim();
}
function hostPart(d) {
  return stripScheme(d).split('/')[0];
}

async function findAppByDomain(domain) {
  const inputFull = stripScheme(domain);
  const inputHost = hostPart(domain);
  const data = await cfFetch('/apps');
  const apps = (data.result || []).map(a => ({
    ...a,
    _full: stripScheme(a.domain),
    _host: hostPart(a.domain),
  }));
  // 1) Prefer exact full match (including path like /admin)
  let match = apps.find(a => a._full === inputFull);
  if (match) return match;
  // 2) Otherwise, prefer same host and the most specific path prefix match
  const inputPath = inputFull.slice(inputHost.length) || '';
  const sameHost = apps.filter(a => a._host === inputHost);
  if (sameHost.length) {
    // pick the app whose base path (pattern without trailing *) is the longest prefix of inputPath
    const prefixMatches = sameHost
      .map(a => {
        const appPath = a._full.slice(a._host.length) || '';
        const base = appPath.replace(/\*+$/, '');
        const isPrefix = inputPath.startsWith(base);
        return { a, baseLen: base.length, isPrefix };
      })
      .filter(x => x.isPrefix)
      .sort((x, y) => y.baseLen - x.baseLen);
    if (prefixMatches.length) return prefixMatches[0].a;
    // fallback to longest _full if no prefix matches
    sameHost.sort((a, b) => b._full.length - a._full.length);
    return sameHost[0];
  }
  // 3) Last resort: partial containment by host string
  return apps.find(a => a._host.startsWith(inputHost) || inputHost.startsWith(a._host));
}

async function resolveServiceTokenId() {
  if (serviceTokenIdArg) return serviceTokenIdArg;
  if (!serviceTokenClientId) {
    console.error('[cf-access-upsert-policy] Provide either --service-token-id or --service-token-client-id');
    process.exit(2);
  }
  const data = await cfFetch('/service_tokens');
  const tokens = data.result || [];
  const normalized = serviceTokenClientId.endsWith('.access')
    ? serviceTokenClientId.slice(0, -('.access'.length))
    : serviceTokenClientId;
  const tok = tokens.find(t =>
    // exact match
    t.client_id === serviceTokenClientId ||
    // match normalized (strip .access from input)
    t.client_id === normalized ||
    // match when token returns without suffix but input includes suffix
    `${t.client_id}.access` === serviceTokenClientId ||
    // match when token returns with suffix but input omitted it
    `${normalized}.access` === t.client_id
  );
  if (!tok) {
    console.error(`[cf-access-upsert-policy] No service token found with client_id ${serviceTokenClientId}`);
    process.exit(1);
  }
  return tok.id; // UUID used in Access policy include rule
}

async function getPolicies(appId) {
  const data = await cfFetch(`/apps/${appId}/policies`);
  return data.result || [];
}

async function createPolicy(appId, name, serviceTokenId, precedence) {
  // This function is no longer used in isolation; see tryUpsertVariants
  // Kept for backward-compatibility if imported elsewhere
  const body = {
    name,
    decision: 'allow',
    include: [ { service_token: { id: serviceTokenId } } ],
    require: [],
    exclude: [],
    precedence,
  };
  const { ok, json } = await cfFetchRaw(`/apps/${appId}/policies`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok) throw new Error(`[cf-access-upsert-policy] Create failed: ${JSON.stringify(json)}`);
  return json.result;
}

async function updatePolicy(appId, policyId, name, serviceTokenId, precedence) {
  // This function is no longer used in isolation; see tryUpsertVariants
  const body = {
    name,
    decision: 'allow',
    include: [ { service_token: { id: serviceTokenId } } ],
    require: [],
    exclude: [],
    precedence,
  };
  const { ok, json } = await cfFetchRaw(`/apps/${appId}/policies/${policyId}` , {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!ok) throw new Error(`[cf-access-upsert-policy] Update failed: ${JSON.stringify(json)}`);
  return json.result;
}

function buildIncludeVariants(serviceTokenId) {
  const variants = [];
  if (serviceTokenId) {
    variants.push([ { service_token: { id: serviceTokenId } } ]);
    variants.push([ { service_token: { identity_id: serviceTokenId } } ]);
  }
  if (fallbackAnyValid) {
    variants.push([ { any_valid_service_token: {} } ]);
  }
  return variants;
}

function buildDecisionVariants() {
  return ['allow', 'non_identity'];
}

async function tryUpsertVariants({ appId, existingPolicy, name, precedence, includeVariants, decisionVariants }) {
  const path = existingPolicy ? `/apps/${appId}/policies/${existingPolicy.id}` : `/apps/${appId}/policies`;
  const method = existingPolicy ? 'PUT' : 'POST';
  let lastError = null;
  for (const decision of decisionVariants) {
    for (const include of includeVariants) {
      const body = {
        name,
        decision,
        include,
        require: [],
        exclude: [],
        precedence,
      };
      const { ok, json, status } = await cfFetchRaw(path, { method, body: JSON.stringify(body) });
      if (ok && json && json.result) {
        return { result: json.result, decision, include };
      }
      lastError = { status, json, decision, include };
    }
  }
  const details = lastError ? JSON.stringify(lastError, null, 2) : 'unknown error';
  throw new Error(`[cf-access-upsert-policy] Failed to ${existingPolicy ? 'update' : 'create'} policy after trying variants. Last error: ${details}`);
}

async function main() {
  const app = await findAppByDomain(appDomain);
  if (!app) {
    console.error(`[cf-access-upsert-policy] No Access app found for domain ${appDomain}. Create an Access app in Cloudflare for this domain/path first.`);
    process.exit(1);
  }
  const serviceTokenId = await resolveServiceTokenId();
  const policies = await getPolicies(app.id);
  const existing = policies.find(p => p.name === policyName);
  const nextPrecedence = Math.max(0, ...policies.map(p => p.precedence || 0)) + 1;

  const includeVariants = buildIncludeVariants(serviceTokenId);
  if (includeVariants.length === 0) {
    console.error('[cf-access-upsert-policy] No include variants to try. Provide a valid service token id or enable --fallback-any-valid-service-token.');
    process.exit(2);
  }
  const decisionVariants = buildDecisionVariants();

  const { result, decision, include } = await tryUpsertVariants({
    appId: app.id,
    existingPolicy: existing,
    name: policyName,
    precedence: existing?.precedence ?? nextPrecedence,
    includeVariants,
    decisionVariants,
  });

  console.log(JSON.stringify({
    action: existing ? 'updated' : 'created',
    app: { id: app.id, domain: app.domain },
    policy: result,
    variant_used: { decision, include },
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
