import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['verbose'],
    testTimeout: 30_000,
    hookTimeout: 15_000,
  },
});
