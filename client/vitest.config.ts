import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // import.meta.dirname (Node 20.11+) replaces __dirname in ESM configs
      '@': `${import.meta.dirname}/src`
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverageThresholds: {
      lines: 80,
      statements: 80,
      branches: 85,
      functions: 80
    }
  }
})
