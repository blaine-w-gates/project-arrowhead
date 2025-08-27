#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_API_KEY, CF_API_EMAIL, CF_ACCOUNT_ID } = env;
if (!CF_ACCOUNT_ID || (!CF_API_TOKEN && !(CF_API_KEY && CF_API_EMAIL))) {
  console.error('[cf-access-update-policy] Missing env. Required: CF_ACCOUNT_ID and (CF_API_TOKEN or CF_API_KEY+CF_API_EMAIL)');
  process.exit(2);
}

// Args
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const policyId = getArg('--policy-id');
const groupId = getArg('--group-id');
const precedence = getArg('--precedence');

if (!policyId) {
  console.error('[cf-access-update-policy] Usage: cf-access-update-policy --policy-id <id> [--group-id <id>] [--precedence <number>]');
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
    console.error(`[cf-access-update-policy] API ${init.method || 'GET'} ${path} failed:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

async function getPolicy(appId, policyId) {
  const data = await cfFetch(`/apps/${appId}/policies/${policyId}`);
  return data.result;
}

async function findAppForPolicy(policyId) {
  const appsData = await cfFetch('/apps');
  const apps = appsData.result || [];
  
  for (const app of apps) {
    const policiesData = await cfFetch(`/apps/${app.id}/policies`);
    const policies = policiesData.result || [];
    if (policies.find(p => p.id === policyId)) {
      return app;
    }
  }
  return null;
}

async function updatePolicy(appId, policyId, updates) {
  const currentPolicy = await getPolicy(appId, policyId);
  const updatedPolicy = { ...currentPolicy, ...updates };
  
  const data = await cfFetch(`/apps/${appId}/policies/${policyId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedPolicy)
  });
  
  return data.result;
}

async function main() {
  console.log(`[cf-access-update-policy] Updating policy ${policyId}`);
  
  // Find which app contains this policy
  const app = await findAppForPolicy(policyId);
  if (!app) {
    console.error(`[cf-access-update-policy] Policy ${policyId} not found in any Access app`);
    process.exit(1);
  }
  
  console.log(`[cf-access-update-policy] Found policy in app: ${app.domain} (${app.id})`);
  
  const updates = {};
  
  // Update to use Access Group if provided
  if (groupId) {
    updates.include = [{ group: { id: groupId } }];
    console.log(`[cf-access-update-policy] Will update to use Access Group: ${groupId}`);
  }
  
  // Update precedence if provided
  if (precedence) {
    updates.precedence = parseInt(precedence, 10);
    console.log(`[cf-access-update-policy] Will update precedence to: ${precedence}`);
  }
  
  if (Object.keys(updates).length === 0) {
    console.log('[cf-access-update-policy] No updates specified');
    return;
  }
  
  const result = await updatePolicy(app.id, policyId, updates);
  
  console.log(JSON.stringify({
    action: 'updated',
    app: { id: app.id, domain: app.domain },
    policy: result,
    updates_applied: updates
  }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
