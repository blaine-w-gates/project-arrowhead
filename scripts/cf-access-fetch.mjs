#!/usr/bin/env node
import { env } from 'node:process';

const { CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = env;

if (!CF_ACCESS_CLIENT_ID || !CF_ACCESS_CLIENT_SECRET) {
  console.error('[cf-access-fetch] Missing env. Required: CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET');
  process.exit(2);
}

const args = process.argv.slice(2);
const bodyOnly = args.includes('--body-only');
const url = args.find(a => !a.startsWith('-'));
if (!url) {
  console.error('[cf-access-fetch] Usage: cf-access-fetch <url>');
  process.exit(2);
}

async function main() {
  const res = await fetch(url, {
    headers: {
      'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET,
    }
  });
  const text = await res.text();
  if (bodyOnly) {
    console.log(text);
  } else {
    console.log(JSON.stringify({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries()),
      body: text,
    }, null, 2));
  }
  if (!res.ok) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
