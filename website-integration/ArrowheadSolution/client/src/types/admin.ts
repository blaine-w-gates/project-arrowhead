export type DataHealth = {
  ok: boolean;
  drift_ok: boolean;
  counts: { fs: number | null | undefined; db: number | null | undefined };
  drift: { only_fs: string[]; only_db: string[] };
  timestamp?: string | null;
  run?: { id?: number | string | null; url?: string | null } | null;
  artifact?: {
    id?: number | string | null;
    name?: string | null;
    expired?: boolean | null;
    size_in_bytes?: number | null;
    created_at?: string | null;
    expires_at?: string | null;
  } | null;
  cached?: boolean;
  stale?: boolean;
  fetched_at?: string;
  cache_ttl_seconds?: number;
};

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
