#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const dist = path.join(root, 'dist', 'public');
  const adminIndex = path.join(dist, 'admin', 'index.html');
  const adminConfig = path.join(dist, 'admin-config', 'config.yml');

  const okIndex = await exists(adminIndex);
  const okConfig = await exists(adminConfig);

  if (!okIndex || !okConfig) {
    console.error('[check-build-admin] Missing admin assets:', {
      index: okIndex,
      config: okConfig,
      adminIndex,
      adminConfig,
    });
    process.exit(1);
  }

  const cfg = await fs.readFile(adminConfig, 'utf-8');
  const hasBackendSection = /(^|\n)\s*backend:\s*(\n|$)/.test(cfg);
  const hasGithubName = /(^|\n)\s*name:\s*github(\s|$)/i.test(cfg);

  // Accept either legacy base_url (/api/oauth) or the new root base_url with explicit auth_endpoint
  const hasBaseUrlLegacy = /(^|\n)\s*base_url:\s*\/api\/oauth(\s|$)/i.test(cfg);
  const hasBaseUrlRoot = /(^|\n)\s*base_url:\s*["']?\/["']?(\s|$)/i.test(cfg);
  const hasAuthEndpoint = /(^|\n)\s*auth_endpoint:\s*["']?api\/oauth\/auth["']?(\s|$)/i.test(cfg);
  const baseUrlValid = hasBaseUrlLegacy || (hasBaseUrlRoot && hasAuthEndpoint);

  if (!hasBackendSection || !hasGithubName || !baseUrlValid) {
    console.error('[check-build-admin] config.yml does not contain expected backend.name or OAuth settings');
    console.error(cfg);
    process.exit(1);
  }

  // Validate redirects
  const redirectsPath = path.join(dist, '_redirects');
  const redirectsExists = await exists(redirectsPath);
  if (!redirectsExists) {
    console.error('[check-build-admin] Missing _redirects file at', redirectsPath);
    process.exit(1);
  }
  const redirectsRaw = await fs.readFile(redirectsPath, 'utf-8');
  const redirectsLines = redirectsRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length && !l.startsWith('#'));
  if (redirectsLines.length < 1) {
    console.error('[check-build-admin] _redirects contains no rules');
    console.error(redirectsRaw);
    process.exit(1);
  }
  const adminRuleRe = /^\s*\/admin\s+\/admin\/index\.html\s+200\s*$/;
  const hasAdminRule = redirectsLines.some((l) => adminRuleRe.test(l));
  if (!hasAdminRule) {
    console.error('[check-build-admin] _redirects missing required /admin rule -> /admin/index.html 200');
    console.error(redirectsRaw);
    process.exit(1);
  }

  console.log('[check-build-admin] OK: admin assets valid and _redirects contains admin rule (', redirectsLines.length, 'rules)');
}

main().catch((e) => {
  console.error('[check-build-admin] Error:', e);
  process.exit(1);
});
