#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_ACCOUNT_ID } = env;
if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error('[cf-access-list-apps] Missing env. Required: CF_API_TOKEN, CF_ACCOUNT_ID');
  process.exit(2);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps`;

async function main() {
  const res = await fetch(API, {
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[cf-access-list-apps] Error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  // Print minimal info per app
  const out = (data.result || []).map(a => ({
    id: a.id,
    name: a.name,
    domain: a.domain,
    type: a.type,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }));
  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
