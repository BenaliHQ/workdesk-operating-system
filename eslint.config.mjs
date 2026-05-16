import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

// Review-bot parity for plugin source (src/**/*.ts only).
// Tests, scripts, and vendor are outside tsconfig.json's `include`, so the
// typed obsidianmd rules can't run on them — they're ignored here.
export default tseslint.config(
  {
    ignores: [
      'main.js',
      'styles.css',
      'node_modules/**',
      'fonts/**',
      'fixtures/**',
      '_inputs/**',
      'src/vendor/**',
      'styles/**',
      'STATE.log',
      'tests/**',
      'scripts/**',
      'esbuild.config.mjs',
      'vitest.config.ts',
      '**/*.d.ts',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // js-yaml is test-only (loaded via the obsidian stub at tests/stubs/obsidian.ts);
  // production code uses parseYaml from obsidian. Silence the dep-ban for the
  // package.json devDependency entry.
  {
    files: ['package.json'],
    rules: { 'depend/ban-dependencies': 'off' },
  },
);
