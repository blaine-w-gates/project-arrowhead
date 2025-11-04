type LockInfo = { userId: string; teamMemberId: string; expiresAt: number };

const LOCK_DURATION_MS = 5 * 60 * 1000;
const locks = new Map<string, LockInfo>();

export function acquireLock(objectiveId: string, userId: string, teamMemberId: string): { ok: true; expiresAt: number } | { ok: false; lock: LockInfo } {
  cleanupExpired();
  const existing = locks.get(objectiveId);
  const now = Date.now();
  if (existing && existing.expiresAt > now && existing.teamMemberId !== teamMemberId) {
    return { ok: false, lock: existing };
  }
  const expiresAt = now + LOCK_DURATION_MS;
  locks.set(objectiveId, { userId, teamMemberId, expiresAt });
  return { ok: true, expiresAt };
}

export function releaseLock(objectiveId: string, teamMemberId: string): boolean {
  cleanupExpired();
  const existing = locks.get(objectiveId);
  if (!existing) return false;
  if (existing.teamMemberId !== teamMemberId) return false;
  locks.delete(objectiveId);
  return true;
}

export function renewLock(objectiveId: string, teamMemberId: string): boolean {
  cleanupExpired();
  const existing = locks.get(objectiveId);
  if (!existing) return false;
  if (existing.teamMemberId !== teamMemberId) return false;
  existing.expiresAt = Date.now() + LOCK_DURATION_MS;
  locks.set(objectiveId, existing);
  return true;
}

export function getLock(objectiveId: string): LockInfo | null {
  cleanupExpired();
  const existing = locks.get(objectiveId);
  if (!existing) return null;
  if (existing.expiresAt <= Date.now()) {
    locks.delete(objectiveId);
    return null;
  }
  return existing;
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, info] of locks) {
    if (info.expiresAt <= now) locks.delete(id);
  }
}
