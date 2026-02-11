#!/usr/bin/env node
/**
 * Sync Cloudflare Pages config files and admin shell into client/public
 * so Vite includes them in the build output.
 */
import fs from 'fs/promises';
import path from 'path';

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyFileSafe(src, dst) {
  await ensureDir(path.dirname(dst));
  await fs.copyFile(src, dst);
}

async function copyDirRecursive(src, dst) {
  await ensureDir(dst);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const source = path.join(root, 'public');
  const dest = path.join(root, 'client', 'public');

  // Copy Cloudflare config files
  const files = ['_redirects', '_headers'];
  for (const file of files) {
    const src = path.join(source, file);
    const dst = path.join(dest, file);
    try {
      if (await exists(src)) {
        await copyFileSafe(src, dst);
        console.log(`[sync-cloudflare-config] Copied ${file} to client/public/`);
      } else {
        console.warn(`[sync-cloudflare-config] Source not found: ${src}`);
      }
    } catch (err) {
      console.error(`[sync-cloudflare-config] Failed to copy ${file}:`, err);
      process.exit(1);
    }
  }

  // Copy admin shell directory if present
  const adminSrc = path.join(source, 'admin');
  const adminDst = path.join(dest, 'admin');
  if (await exists(adminSrc)) {
    await copyDirRecursive(adminSrc, adminDst);
    console.log('[sync-cloudflare-config] Copied admin/ to client/public/admin');
  } else {
    console.warn(`[sync-cloudflare-config] No public/admin directory found at ${adminSrc}`);
  }
}

main().catch((e) => {
  console.error('[sync-cloudflare-config] Error:', e);
  process.exit(1);
});
