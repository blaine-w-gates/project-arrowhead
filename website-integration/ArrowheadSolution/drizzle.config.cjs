// drizzle.config.cjs
const path = require('path');
const dotenv = require('dotenv');

// Use the built-in __dirname and construct the path
const envPath = path.join(__dirname, 'server', '.env');
dotenv.config({ path: envPath });
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in server/.env');
}
/** @type { import("drizzle-kit").Config } */
module.exports = {
  schema: './shared/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
