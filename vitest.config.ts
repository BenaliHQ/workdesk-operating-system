import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/fixtures/**', 'tests/stubs/**'],
  },
  resolve: {
    alias: {
      obsidian: new URL('./tests/stubs/obsidian.ts', import.meta.url).pathname,
    },
  },
});
