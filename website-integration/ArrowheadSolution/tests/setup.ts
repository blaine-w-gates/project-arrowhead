// Vitest global test setup
// - Extends DOM matchers
// - Provides minimal JSDOM defaults

import '@testing-library/jest-dom/vitest';

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
