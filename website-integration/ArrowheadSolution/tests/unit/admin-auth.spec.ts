import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../server/admin/auth';

describe('admin auth password utils', () => {
  it('hashes and verifies a password', async () => {
    const pw = 'postgres';
    const hash = await hashPassword(pw);
    expect(hash).toBeTypeOf('string');
    expect(hash.length).toBeGreaterThan(20);
    const ok = await verifyPassword(pw, hash);
    expect(ok).toBe(true);
  });

  it('fails verification for wrong password', async () => {
    const hash = await hashPassword('postgres');
    const ok = await verifyPassword('wrong', hash);
    expect(ok).toBe(false);
  });
});
