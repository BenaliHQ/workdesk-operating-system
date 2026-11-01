// Shared esbuild options for main.js. Imported by esbuild.config.mjs (the
// real build) and tests/mobile-bundle.spec.ts (which bundles in memory and
// evaluates the result without Node/Electron, as Obsidian mobile does).

export function mainBundleOptions({ dev = false } = {}) {
  return {
    entryPoints: ['src/main.ts'],
    outfile: 'main.js',
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'ES2022',
    loader: { '.yaml': 'text' },
    external: [
      'obsidian',
      'electron',
      '@codemirror/*',
      '@lezer/*',
      'fs',
      'os',
      'path',
      'child_process',
      'node:fs',
      'node:os',
      'node:path',
      'node:child_process',
      'node:url',
      'url',
    ],
    sourcemap: dev,
    minify: !dev,
    logLevel: 'info',
  };
}
