#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { hashPassword } from '../auth/password';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=newpass tsx server/scripts/reset-admin-password.ts');
    process.exit(1);
  }
  console.log(`🔐 Resetting password for ${email}...`);
  const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (result.length === 0) {
    console.error('❌ Admin user not found');
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.email, email));
  console.log('✅ Password updated');
}

main().catch((e) => { console.error(e); process.exit(1); });
