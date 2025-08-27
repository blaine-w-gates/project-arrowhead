#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_API_KEY, CF_API_EMAIL, CF_ACCOUNT_ID } = env;
if (!CF_ACCOUNT_ID || (!CF_API_TOKEN && !(CF_API_KEY && CF_API_EMAIL))) {
  console.error('[cf-access-create-group] Missing env. Required: CF_ACCOUNT_ID and (CF_API_TOKEN or CF_API_KEY+CF_API_EMAIL)');
  process.exit(2);
}

// Args
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const groupName = getArg('--group-name') || 'Specific Service Token Group';
const serviceTokenId = getArg('--service-token-id');

if (!serviceTokenId) {
  console.error('[cf-access-create-group] Usage: cf-access-create-group --service-token-id <uuid> [--group-name <name>]');
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
    console.error(`[cf-access-create-group] API ${init.method || 'GET'} ${path} failed:`, JSON.stringify(json, null, 2));
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

function buildIncludeVariants(serviceTokenId) {
  return [
    // Try specific service token variants
    [{ service_token: { id: serviceTokenId } }],
    [{ service_token: { identity_id: serviceTokenId } }],
    // Try any valid service token as fallback
    [{ any_valid_service_token: {} }]
  ];
}

async function tryCreateGroupVariants(name, includeVariants) {
  let lastError = null;
  
  for (const include of includeVariants) {
    const body = {
      name,
      include,
      exclude: [],
      require: [],
      is_default: false
    };
    
    console.log(`[cf-access-create-group] Trying include variant:`, JSON.stringify(include, null, 2));
    
    const { ok, json, status } = await cfFetchRaw('/groups', { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
    
    if (ok && json && json.result) {
      console.log(`[cf-access-create-group] Success with variant:`, JSON.stringify(include, null, 2));
      return { result: json.result, include };
    }
    
    console.log(`[cf-access-create-group] Failed with status ${status}:`, JSON.stringify(json, null, 2));
    lastError = { status, json, include };
  }
  
  const details = lastError ? JSON.stringify(lastError, null, 2) : 'unknown error';
  throw new Error(`[cf-access-create-group] Failed to create group after trying variants. Last error: ${details}`);
}

async function main() {
  console.log(`[cf-access-create-group] Creating Access Group "${groupName}" for service token ${serviceTokenId}`);
  
  const includeVariants = buildIncludeVariants(serviceTokenId);
  const { result, include } = await tryCreateGroupVariants(groupName, includeVariants);
  
  console.log(JSON.stringify({
    action: 'created',
    group: result,
    variant_used: { include },
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
