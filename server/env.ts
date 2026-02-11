import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local first (if present), then .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load .env.local first (overrides .env)
dotenv.config({ path: path.join(projectRoot, '.env.local') });
// Load .env (defaults)
dotenv.config({ path: path.join(projectRoot, '.env') });

console.log('✅ Environment variables loaded via server/env.ts');
