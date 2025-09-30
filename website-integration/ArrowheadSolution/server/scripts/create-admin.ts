#!/usr/bin/env tsx
/**
 * Create Admin User Script
 * 
 * Usage:
 *   npm run create-admin
 *   
 * Or with custom credentials:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123 npm run create-admin
 */

import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { hashPassword } from '../admin/auth';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@projectarrowhead.com';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const role = (process.env.ADMIN_ROLE as any) || 'super_admin';

    console.log('🔐 Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);

    // Check if admin already exists
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log('❌ Admin user already exists with this email');
      console.log('Use a different email or delete the existing admin first');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const result = await db
      .insert(adminUsers)
      .values({
        email,
        passwordHash,
        role,
        isActive: true,
      })
      .returning();

    console.log('✅ Admin user created successfully!');
    console.log(`ID: ${result[0].id}`);
    console.log(`Email: ${result[0].email}`);
    console.log(`Role: ${result[0].role}`);
    console.log('');
    console.log('🔗 Login at: http://localhost:5000/admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password immediately after first login!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin();
