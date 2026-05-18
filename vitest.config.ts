import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Mirrors the esbuild text loader for .yaml imports so vitest can resolve
// the inlined fixture imports in src/services/vault-scan.ts.
const yamlAsText = {
  name: 'workdesk-yaml-as-text',
  transform(_code: string, id: string) {
    if (!id.endsWith('.yaml')) return null;
    const content = readFileSync(id, 'utf8');
    return {
      code: `export default ${JSON.stringify(content)};`,
      map: null,
    };
  },
};

export default defineConfig({
  plugins: [yamlAsText],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/fixtures/**', 'tests/stubs/**'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      obsidian: new URL('./tests/stubs/obsidian.ts', import.meta.url).pathname,
    },
  },
});
