#!/usr/bin/env node
import { env } from 'node:process';

const { CF_API_TOKEN, CF_ACCOUNT_ID, CF_PAGES_PROJECT } = env;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_PAGES_PROJECT) {
  console.error('[cf-pages-deploys] Missing env. Required: CF_API_TOKEN, CF_ACCOUNT_ID, CF_PAGES_PROJECT');
  process.exit(2);
}

const headers = {
  'Authorization': `Bearer ${CF_API_TOKEN}`,
  'Content-Type': 'application/json',
};

const base = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${encodeURIComponent(CF_PAGES_PROJECT)}`;

async function main() {
  const url = `${base}/deployments?per_page=5`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    console.error('[cf-pages-deploys] API error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  const list = data.result || [];
  for (const d of list) {
    const latestStage = (d.stages || []).slice(-1)[0];
    console.log(JSON.stringify({
      id: d.id,
      env: d.environment,
      url: d.url,
      created_on: d.created_on,
      source: d.source || d.deployment_trigger?.metadata || null,
      commit: d.deployment_trigger?.metadata?.commit_hash || d.commit_hash || null,
      branch: d.deployment_trigger?.metadata?.branch || null,
      stage: latestStage?.name,
      status: latestStage?.status,
    }, null, 2));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
