import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file in the server directory (ESM-safe)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

let pool: pg.Pool | undefined;
let dbInstance: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (dbInstance) return dbInstance;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Cannot initialize database.');
  }
  // Allow forcing an IPv4 address via PGHOSTADDR while preserving TLS SNI using the original hostname
  const url = new URL(process.env.DATABASE_URL);
  const servername = url.hostname;
  const hostOverride = process.env.PGHOSTADDR || process.env.DB_HOST_IPV4;

  // Build an effective connection string with IPv4 host if provided
  let effectiveConnectionString = process.env.DATABASE_URL;
  if (hostOverride) {
    const u = new URL(process.env.DATABASE_URL);
    u.hostname = hostOverride;
    // Preserve sslmode=require in query for clarity; Node 'pg' relies on ssl option below
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    effectiveConnectionString = u.toString();
  }

  const poolConfig: pg.PoolConfig = {
    connectionString: effectiveConnectionString,
    // Enforce TLS and correct SNI for certificate validation against original hostname
    ssl: { rejectUnauthorized: true, servername },
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

// Convenience export for common use
export const db = getDb();
