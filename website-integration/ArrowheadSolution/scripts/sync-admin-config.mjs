#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyFileSafe(src, dest) {
  const dir = path.dirname(dest);
  await ensureDir(dir);
  await fs.copyFile(src, dest);
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'public', 'admin', 'config.yml');
  const dest = path.join(root, 'client', 'public', 'admin', 'config.yml');

  try {
    await fs.access(src);
  } catch (e) {
    console.error(`[sync-admin-config] Source not found: ${src}`);
    process.exit(0); // do not fail dev; just warn
  }

  await copyFileSafe(src, dest);
  console.log(`[sync-admin-config] Synced: ${src} -> ${dest}`);
}

main().catch((err) => {
  console.error('[sync-admin-config] Error:', err);
  process.exit(1);
});
