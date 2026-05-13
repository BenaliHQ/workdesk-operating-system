#!/usr/bin/env node
// Bundles src/main.ts → main.js (cjs, external obsidian) and
// concatenates styles/{fonts,tokens,app,reduced-motion}.css → styles.css.

import esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');

const cssOrder = ['styles/fonts.css', 'styles/tokens.css', 'styles/app.css', 'styles/reduced-motion.css'];
const concatenated = cssOrder
  .map((p) => {
    const full = resolve(__dirname, p);
    if (!existsSync(full)) return `/* ${p} missing */`;
    return `/* ===== ${p} ===== */\n${readFileSync(full, 'utf8')}`;
  })
  .join('\n\n');
writeFileSync(resolve(__dirname, 'styles.css'), concatenated, 'utf8');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'ES2022',
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
  ],
  sourcemap: dev,
  minify: !dev,
  logLevel: 'info',
});
