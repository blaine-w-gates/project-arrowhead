import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../../server/auth/password';

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const pw = 'postgres';
    const hash = await hashPassword(pw);
    expect(hash).toBeTypeOf('string');
    // derived key length depends on scrypt parameters but should be substantial
    expect(hash.length).toBeGreaterThan(20);
    const ok = await comparePassword(pw, hash);
    expect(ok).toBe(true);
  });

  it('fails verification for wrong password', async () => {
    const hash = await hashPassword('postgres');
    const ok = await comparePassword('wrong', hash);
    expect(ok).toBe(false);
  });
});
