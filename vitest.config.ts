import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['tests/integration/**', 'node'],
    ],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/{unit,integration}/**/*.{test,spec}.?(c|m)[tj]s?(x)'],
    exclude: ['tests/e2e/**', 'tests/integration/blog.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 45,
        lines: 50,
      },
      include: [
        'server/admin/**',
        'server/auth/**',
        'server/db.ts',
        'shared/schema.ts',
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'client/**',
        '.adminjs/**',
      ],
    },
  },
});
