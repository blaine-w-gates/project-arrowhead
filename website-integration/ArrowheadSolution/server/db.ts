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
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
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
