import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    // Each test file spins up its own in-memory MongoDB; cap the worker
    // count so the full suite does not launch a dozen mongods at once
    // (kept flake-free under load, wall time is unchanged in practice).
    poolOptions: {
      forks: { minForks: 1, maxForks: 4 }
    },
    teardownTimeout: 10000,
    hookTimeout: 10000
  }
});
