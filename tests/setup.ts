// Vitest global test setup
// - Extends DOM matchers
// - Provides minimal JSDOM defaults

import '@testing-library/jest-dom/vitest';

// Ensure local Postgres in tests does not try to use SSL
if (!process.env.DB_SSL_DISABLE) {
  process.env.DB_SSL_DISABLE = '1';
}

// Helpful defaults for JSDOM-based tests
beforeAll(() => {
  // Ensure a predictable URL origin in tests
  if (typeof window !== 'undefined' && window.location) {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/'),
      writable: false,
    });
  }
});
