#!/usr/bin/env node
/**
 * Sync Cloudflare Pages config files (_redirects, _headers) to client/public
 * so Vite includes them in the build output.
 */
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const source = path.join(root, 'public');
  const dest = path.join(root, 'client', 'public');

  const files = ['_redirects', '_headers'];

  for (const file of files) {
    const src = path.join(source, file);
    const dst = path.join(dest, file);
    try {
      await fs.copyFile(src, dst);
      console.log(`[sync-cloudflare-config] Copied ${file} to client/public/`);
    } catch (err) {
      console.error(`[sync-cloudflare-config] Failed to copy ${file}:`, err);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error('[sync-cloudflare-config] Error:', e);
  process.exit(1);
});
