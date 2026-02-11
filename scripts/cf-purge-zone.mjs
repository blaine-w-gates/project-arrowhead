#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_ZONE_ID } = env;

if (!CF_API_TOKEN || !CF_ZONE_ID) {
  console.error('[cf-purge-zone] Missing env. Required: CF_API_TOKEN, CF_ZONE_ID');
  process.exit(2);
}

const headers = {
  'Authorization': `Bearer ${CF_API_TOKEN}`,
  'Content-Type': 'application/json',
};

async function main() {
  const files = process.argv.slice(2).filter(Boolean);
  const url = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`;
  const body = files.length ? { files } : { purge_everything: true };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    console.error('[cf-purge-zone] API error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  console.log('[cf-purge-zone] Success:', JSON.stringify(data.result || {}, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
