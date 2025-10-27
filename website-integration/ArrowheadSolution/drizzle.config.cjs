// drizzle.config.cjs
const path = require('path');
const dotenv = require('dotenv');

// Load local overrides first, then default env
const envLocalPath = path.join(__dirname, 'server', '.env.local');
dotenv.config({ path: envLocalPath });
const envPath = path.join(__dirname, 'server', '.env');
dotenv.config({ path: envPath });
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in server/.env.local or server/.env');
}
/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: ['./shared/schema.ts', './shared/schema/index.ts'],
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
