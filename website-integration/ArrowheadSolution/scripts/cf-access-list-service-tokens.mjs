#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_ACCOUNT_ID } = env;
if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error('[cf-access-list-service-tokens] Missing env. Required: CF_API_TOKEN, CF_ACCOUNT_ID');
  process.exit(2);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/service_tokens`;

async function main() {
  const res = await fetch(API, {
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[cf-access-list-service-tokens] Error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  const out = (data.result || []).map(t => ({
    id: t.id,
    name: t.name,
    client_id: t.client_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
    expires_at: t.expires_at
  }));
  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
