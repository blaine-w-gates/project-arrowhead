import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local first (if present), then .env (ESM-safe)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

let pool: pg.Pool | undefined;
let dbInstance: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (dbInstance) return dbInstance;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Cannot initialize database.');
  }
  // Parse and handle connection string overrides (for Render/Supabase compatibility)
  let effectiveConnectionString = process.env.DATABASE_URL;
  const hostOverride = process.env.DB_HOST;
  const u = new URL(effectiveConnectionString);
  const servername = hostOverride || u.hostname;
  
  if (hostOverride) {
    u.hostname = hostOverride;
  }
  
  // Check if using Supabase (either pooler or direct)
  const isSupabase = u.hostname.includes('supabase.co') || u.hostname.includes('pooler.supabase.com');
  
  // Add pgbouncer=true for Supabase connection pooler if not already present
  if (u.port === '6543' && u.hostname.includes('supabase.co') && !u.searchParams.has('pgbouncer')) {
    u.searchParams.set('pgbouncer', 'true');
  }
  
  // For non-Supabase connections, preserve sslmode=require
  if (!isSupabase && !u.searchParams.has('sslmode')) {
    u.searchParams.set('sslmode', 'require');
  }
  
  effectiveConnectionString = u.toString();

  // Decide SSL usage: disable for local dev, enable for remote
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  const sslDisabled = process.env.DB_SSL_DISABLE === '1' || (process.env.NODE_ENV === 'development' && isLocalHost);

  const poolConfig: pg.PoolConfig = {
    connectionString: effectiveConnectionString,
    ...(sslDisabled
      ? {}
      : { ssl: isSupabase 
          ? { rejectUnauthorized: false } // Supabase uses self-signed certs
          : { rejectUnauthorized: true, servername }
        }
    ),
    connectionTimeoutMillis: 10000, // 10 second connection timeout
    idleTimeoutMillis: 30000, // 30 second idle timeout
    max: 20, // maximum pool size
  };

  pool = new pg.Pool(poolConfig);
  dbInstance = drizzle(pool);
  return dbInstance;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
    dbInstance = undefined;
  }
}

// Lazy-initialized db instance (only initialized when accessed)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDb();
    return instance[prop as keyof typeof instance];
  }
});
